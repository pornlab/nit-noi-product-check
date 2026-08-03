import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InventorySessionStatus, Prisma, Unit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';

export interface ZoneInventoryProduct {
  id: string;
  name: string;
  unit: Unit;
  category: { id: string; name: string } | null;
  lastQuantity: string | null;
}

export interface ZoneInventoryResponse {
  zone: { id: string; name: string };
  products: ZoneInventoryProduct[];
  lastCompletedAt: string | null;
  lastCompletedBy: { id: string; name: string } | null;
}

export interface InventoryZoneSummary {
  id: string;
  name: string;
  lastCompletedAt: string | null;
}

export interface InventorySessionSummary {
  id: string;
  sequenceNumber: number;
  completedAt: string;
  createdBy: { id: string; name: string; role: 'admin' | 'manager' | 'employee' | 'analytics' };
}

export interface InventorySessionDetailItem {
  id: string;
  productId: string;
  name: string;
  unit: Unit;
  category: { id: string; name: string } | null;
  quantity: string;
  updatedAt: string;
  updatedBy: { id: string; name: string; role: 'admin' | 'manager' | 'employee' | 'analytics' } | null;
}

export interface InventorySessionDetail {
  id: string;
  sequenceNumber: number;
  status: InventorySessionStatus;
  startedAt: string;
  completedAt: string | null;
  zone: { id: string; name: string };
  createdBy: { id: string; name: string; email: string; role: 'admin' | 'manager' | 'employee' | 'analytics' };
  items: InventorySessionDetailItem[];
}

export interface CreateInventoryResponse {
  id: string;
  sequenceNumber: number;
  zoneId: string;
  status: InventorySessionStatus;
  itemsCount: number;
  completedAt: string;
}

interface LatestQtyRow { productId: string; quantity: Prisma.Decimal }

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Access to a zone: same org, and for employee — must be assigned. 404 on any failure. */
  private async loadAccessibleZone(user: AuthUser, zoneId: string): Promise<{ id: string; name: string; isActive: boolean }> {
    const zone = await this.prisma.zone.findFirst({
      where: { id: zoneId, organizationId: user.organizationId },
      select: { id: true, name: true, isActive: true },
    });
    if (!zone) throw new NotFoundException('Зона не найдена');
    if (user.role === 'employee') {
      const assignment = await this.prisma.userZone.findUnique({
        where: { userId_zoneId: { userId: user.id, zoneId } },
        select: { id: true },
      });
      if (!assignment) throw new NotFoundException('Зона не найдена');
    }
    return zone;
  }

  private async zoneEligibleProducts(orgId: string, zoneId: string) {
    return this.prisma.product.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        isInventoryTracked: true,
        zones: { some: { zoneId } },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        baseUnit: true,
        category: { select: { id: true, name: true } },
      },
    });
  }

  private async lastCompletedSession(orgId: string, zoneId: string) {
    return this.prisma.inventorySession.findFirst({
      where: {
        organizationId: orgId,
        zoneId,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, completedAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  /** Zones accessible to the user with their last completed inventory timestamp. */
  async listZones(user: AuthUser): Promise<InventoryZoneSummary[]> {
    const where: Prisma.ZoneWhereInput = {
      organizationId: user.organizationId,
      isActive: true,
    };
    if (user.role === 'employee') {
      where.users = { some: { userId: user.id } };
    }

    const zones = await this.prisma.zone.findMany({
      where,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    // Пакетный запрос: последняя completed session для каждой зоны в одной выборке
    const zoneIds = zones.map((z) => z.id);
    if (zoneIds.length === 0) return [];

    const latest = await this.prisma.$queryRaw<Array<{ zoneId: string; completedAt: Date }>>`
      SELECT DISTINCT ON (s."zoneId") s."zoneId", s."completedAt"
      FROM "inventory_sessions" s
      WHERE s."organizationId" = ${user.organizationId}
        AND s."zoneId" IN (${Prisma.join(zoneIds)})
        AND s."status" = 'COMPLETED'
        AND s."completedAt" IS NOT NULL
      ORDER BY s."zoneId", s."completedAt" DESC, s."id" DESC
    `;
    const map = new Map<string, Date>();
    for (const r of latest) map.set(r.zoneId, r.completedAt);

    return zones.map((z) => ({
      id: z.id,
      name: z.name,
      lastCompletedAt: map.has(z.id) ? (map.get(z.id) as Date).toISOString() : null,
    }));
  }

  /** История COMPLETED сессий для зоны (доступ через loadAccessibleZone). */
  async listZoneSessions(user: AuthUser, zoneId: string): Promise<InventorySessionSummary[]> {
    await this.loadAccessibleZone(user, zoneId);
    const sessions = await this.prisma.inventorySession.findMany({
      where: {
        organizationId: user.organizationId,
        zoneId,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        sequenceNumber: true,
        completedAt: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
    return sessions.map((s) => ({
      id: s.id,
      sequenceNumber: s.sequenceNumber,
      completedAt: (s.completedAt as Date).toISOString(),
      createdBy: { id: s.createdBy.id, name: s.createdBy.name, role: s.createdBy.role },
    }));
  }

  async getSessionDetail(user: AuthUser, sessionId: string): Promise<InventorySessionDetail> {
    const session = await this.prisma.inventorySession.findFirst({
      where: { id: sessionId, organizationId: user.organizationId },
      select: {
        id: true, sequenceNumber: true, status: true, startedAt: true, completedAt: true,
        zone: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          orderBy: [{ product: { category: { name: 'asc' } } }, { product: { name: 'asc' } }],
          select: {
            id: true,
            productId: true,
            quantity: true,
            updatedAt: true,
            updatedBy: { select: { id: true, name: true, role: true } },
            product: {
              select: {
                name: true, baseUnit: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Инвентаризация не найдена');

    if (user.role === 'employee') {
      const assignment = await this.prisma.userZone.findUnique({
        where: { userId_zoneId: { userId: user.id, zoneId: session.zone.id } },
        select: { id: true },
      });
      if (!assignment) throw new NotFoundException('Инвентаризация не найдена');
    }

    return {
      id: session.id,
      sequenceNumber: session.sequenceNumber,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt ? session.completedAt.toISOString() : null,
      zone: { id: session.zone.id, name: session.zone.name },
      createdBy: {
        id: session.createdBy.id,
        name: session.createdBy.name,
        email: session.createdBy.email,
        role: session.createdBy.role,
      },
      items: session.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        name: it.product.name,
        unit: it.product.baseUnit,
        category: it.product.category,
        quantity: it.quantity.toString(),
        updatedAt: it.updatedAt.toISOString(),
        updatedBy: it.updatedBy
          ? { id: it.updatedBy.id, name: it.updatedBy.name, role: it.updatedBy.role }
          : null,
      })),
    };
  }

  /** Admin-only: коррекция количества в позиции завершённой сессии. Фиксируем автора и время. */
  async updateItemQuantity(
    user: AuthUser,
    sessionId: string,
    itemId: string,
    quantity: number,
  ): Promise<InventorySessionDetail> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Только администратор может править инвентаризацию');
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new BadRequestException('Количество не может быть отрицательным');
    }

    const session = await this.prisma.inventorySession.findFirst({
      where: { id: sessionId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!session) throw new NotFoundException('Инвентаризация не найдена');

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, inventorySessionId: sessionId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Позиция не найдена');

    await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        quantity: new Prisma.Decimal(quantity),
        updatedById: user.id,
      },
    });

    return this.getSessionDetail(user, sessionId);
  }

  async getZoneInventory(user: AuthUser, zoneId: string): Promise<ZoneInventoryResponse> {
    const zone = await this.loadAccessibleZone(user, zoneId);
    const products = await this.zoneEligibleProducts(user.organizationId, zoneId);

    const latest = await this.prisma.$queryRaw<LatestQtyRow[]>`
      SELECT DISTINCT ON (ii."productId") ii."productId", ii."quantity"
      FROM "inventory_items" ii
      JOIN "inventory_sessions" s ON s."id" = ii."inventorySessionId"
      WHERE s."zoneId" = ${zoneId}
        AND s."organizationId" = ${user.organizationId}
        AND s."status" = 'COMPLETED'
        AND s."completedAt" IS NOT NULL
      ORDER BY ii."productId", s."completedAt" DESC, s."id" DESC
    `;
    const latestMap = new Map<string, string>();
    for (const row of latest) latestMap.set(row.productId, row.quantity.toString());

    const lastSession = await this.lastCompletedSession(user.organizationId, zoneId);

    return {
      zone: { id: zone.id, name: zone.name },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.baseUnit,
        category: p.category,
        lastQuantity: latestMap.get(p.id) ?? null,
      })),
      lastCompletedAt: lastSession?.completedAt ? lastSession.completedAt.toISOString() : null,
      lastCompletedBy: lastSession?.createdBy ? { id: lastSession.createdBy.id, name: lastSession.createdBy.name } : null,
    };
  }

  async create(
    user: AuthUser,
    input: { zoneId: string; items: Array<{ productId: string; quantity: number }> },
  ): Promise<CreateInventoryResponse> {
    const zone = await this.loadAccessibleZone(user, input.zoneId);
    if (!zone.isActive) throw new BadRequestException('Зона неактивна');

    // Сотрудник не может создать вторую инвентаризацию той же зоны в тот же день
    if (user.role === 'employee') {
      const today = startOfToday();
      const alreadyToday = await this.prisma.inventorySession.findFirst({
        where: {
          organizationId: user.organizationId,
          zoneId: input.zoneId,
          status: 'COMPLETED',
          completedAt: { gte: today },
        },
        select: { id: true },
      });
      if (alreadyToday) {
        throw new ForbiddenException('Инвентаризация зоны на сегодня уже завершена');
      }
    }

    const eligible = await this.zoneEligibleProducts(user.organizationId, input.zoneId);
    const eligibleIds = new Set(eligible.map((p) => p.id));

    const requestIds = input.items.map((i) => i.productId);
    if (requestIds.length === 0) throw new BadRequestException('Нужна хотя бы одна позиция');
    if (new Set(requestIds).size !== requestIds.length) {
      throw new BadRequestException('Товар не должен повторяться');
    }
    for (const id of requestIds) {
      if (!eligibleIds.has(id)) throw new BadRequestException('Товар не относится к зоне');
    }
    const requestSet = new Set(requestIds);
    for (const id of eligibleIds) {
      if (!requestSet.has(id)) throw new BadRequestException('Необходимо указать количество всех товаров зоны');
    }

    for (const item of input.items) {
      if (!Number.isFinite(item.quantity) || item.quantity < 0) {
        throw new BadRequestException('Количество не может быть отрицательным');
      }
    }

    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      // Advisory lock per (organization + 'inventory_seq') на длительность транзакции —
      // сериализует расчёт следующего номера, исключает конфликты при параллельных create.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'inventory_seq:' + user.organizationId}, 0))`;

      const maxRow = await tx.inventorySession.aggregate({
        where: { organizationId: user.organizationId },
        _max: { sequenceNumber: true },
      });
      const nextSeq = (maxRow._max.sequenceNumber ?? 0) + 1;

      return tx.inventorySession.create({
        data: {
          organizationId: user.organizationId,
          sequenceNumber: nextSeq,
          zoneId: input.zoneId,
          createdById: user.id,
          status: 'COMPLETED',
          startedAt: now,
          completedAt: now,
          items: {
            createMany: {
              data: input.items.map((i) => ({
                productId: i.productId,
                quantity: new Prisma.Decimal(i.quantity),
              })),
            },
          },
        },
        select: {
          id: true, sequenceNumber: true, zoneId: true, status: true, completedAt: true,
          _count: { select: { items: true } },
        },
      });
    });

    return {
      id: created.id,
      sequenceNumber: created.sequenceNumber,
      zoneId: created.zoneId,
      status: created.status,
      itemsCount: created._count.items,
      completedAt: (created.completedAt ?? now).toISOString(),
    };
  }
}
