import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';
import type { CreateDisposalDto } from './dto/create-disposal.dto';
import type { ListDisposalsQueryDto } from './dto/list-disposals-query.dto';

export interface DisposalSummaryItem {
  productName: string;
  baseUnit: string;
  quantity: string;
  /** Цена за единицу из последнего поступления. null, если приходов не было. */
  unitPrice: string | null;
  /** quantity × unitPrice. null, если unitPrice неизвестен. */
  cost: string | null;
  /** Валюта из последнего поступления. null, если приходов не было. */
  currency: string | null;
}

export interface DisposalSummary {
  id: string;
  createdAt: string;
  zone: { id: string; name: string };
  createdBy: { id: string; name: string; role: string };
  skuCount: number;
  items: DisposalSummaryItem[];
  /** Сумма cost по всем позициям (пропускает null). null, если ни одной цены нет. */
  totalCost: string | null;
  /** Валюта, доминирующая среди позиций (обычно одинаковая). null, если нет цен. */
  currency: string | null;
}

export interface DisposalDetailItem {
  id: string;
  product: { id: string; name: string; baseUnit: string };
  quantity: string;
}

export interface DisposalDetail extends Omit<DisposalSummary, 'items'> {
  items: DisposalDetailItem[];
}

@Injectable()
export class DisposalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Список утилизаций:
   *  - admin/manager: все по организации;
   *  - employee: только по зонам, к которым он привязан.
   */
  async list(user: AuthUser, filter: ListDisposalsQueryDto = {}): Promise<DisposalSummary[]> {
    const where: Prisma.DisposalWhereInput = { organizationId: user.organizationId };

    // Диапазон дат: включительно; dateTo раскрываем до 23:59:59.999.
    if (filter.dateFrom || filter.dateTo) {
      const range: { gte?: Date; lte?: Date } = {};
      if (filter.dateFrom) range.gte = new Date(`${filter.dateFrom.slice(0, 10)}T00:00:00.000Z`);
      if (filter.dateTo) range.lte = new Date(`${filter.dateTo.slice(0, 10)}T23:59:59.999Z`);
      where.createdAt = range;
    }

    // Роль автора — учитываем только для admin (владельца).
    if (user.role === 'admin' && filter.role) {
      where.createdBy = { role: filter.role };
    }

    // Ограничение по зоне для запроса. Для employee дополнительно скоуп по его зонам.
    if (filter.zoneId) {
      where.zoneId = filter.zoneId;
    }
    if (user.role === 'employee') {
      // Скоуп по своим зонам (перекрывает произвольный zoneId, если он не в списке).
      const userZones = await this.prisma.userZone.findMany({
        where: { userId: user.id },
        select: { zoneId: true },
      });
      const allowedZoneIds = userZones.map((z) => z.zoneId);
      if (filter.zoneId && !allowedZoneIds.includes(filter.zoneId)) {
        // Пользователь запросил чужую зону — возвращаем пусто.
        return [];
      }
      where.zoneId = filter.zoneId ?? { in: allowedZoneIds };
    }

    const rows = await this.prisma.disposal.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        zone: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          select: {
            quantity: true,
            productId: true,
            product: { select: { name: true, baseUnit: true } },
          },
          orderBy: { product: { name: 'asc' } },
        },
      },
    });

    // Собираем последние цены за единицу для всех фигурирующих товаров одним запросом.
    const productIds = [...new Set(rows.flatMap((r) => r.items.map((it) => it.productId)))];
    const priceMap = await this.loadLastPriceMap(user.organizationId, productIds);

    return rows.map((r) => {
      const items = r.items.map((it) => {
        const price = priceMap.get(it.productId);
        const cost = price ? new Prisma.Decimal(it.quantity).times(price.unitPrice) : null;
        return {
          productName: it.product.name,
          baseUnit: it.product.baseUnit as unknown as string,
          quantity: it.quantity.toString(),
          unitPrice: price ? price.unitPrice.toString() : null,
          cost: cost ? cost.toDecimalPlaces(2).toString() : null,
          currency: price?.currency ?? null,
        };
      });

      // Итог: сумма cost по позициям, где известна цена. Валюта — наиболее частая среди позиций.
      let total: Prisma.Decimal | null = null;
      const currCount = new Map<string, number>();
      for (const it of items) {
        if (it.cost !== null) {
          total = (total ?? new Prisma.Decimal(0)).plus(it.cost);
        }
        if (it.currency) currCount.set(it.currency, (currCount.get(it.currency) ?? 0) + 1);
      }
      const currency = [...currCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        zone: r.zone,
        createdBy: r.createdBy,
        skuCount: r.items.length,
        items,
        totalCost: total ? total.toDecimalPlaces(2).toString() : null,
        currency,
      };
    });
  }

  /**
   * Для набора productId — цена за единицу из последнего поступления (cost / quantity)
   * и валюта того поступления. Копия логики из products.service, вынесена локально,
   * чтобы не тянуть межмодульную зависимость.
   */
  private async loadLastPriceMap(
    orgId: string,
    productIds: string[],
  ): Promise<Map<string, { unitPrice: Prisma.Decimal; currency: string }>> {
    const map = new Map<string, { unitPrice: Prisma.Decimal; currency: string }>();
    if (productIds.length === 0) return map;

    const rows = await this.prisma.$queryRaw<
      Array<{ productId: string; quantity: Prisma.Decimal; cost: Prisma.Decimal; currency: string }>
    >`
      SELECT DISTINCT ON (ri."productId")
        ri."productId", ri.quantity, ri.cost, r.currency
      FROM "receiving_items" ri
      JOIN "receivings" r ON r.id = ri."receivingId"
      WHERE r."organizationId" = ${orgId}
        AND ri."productId" IN (${Prisma.join(productIds)})
      ORDER BY ri."productId", r."receivedAt" DESC, r."id" DESC
    `;
    for (const row of rows) {
      const qty = new Prisma.Decimal(row.quantity);
      if (qty.isZero()) continue;
      map.set(row.productId, {
        unitPrice: new Prisma.Decimal(row.cost).div(qty),
        currency: row.currency,
      });
    }
    return map;
  }

  async get(user: AuthUser, id: string): Promise<DisposalDetail> {
    const row = await this.prisma.disposal.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        ...(user.role === 'employee'
          ? { zone: { users: { some: { userId: user.id } } } }
          : {}),
      },
      include: {
        zone: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: { product: { select: { id: true, name: true, baseUnit: true } } },
          orderBy: { product: { name: 'asc' } },
        },
      },
    });
    if (!row) throw new NotFoundException('Утилизация не найдена');

    const productIds = [...new Set(row.items.map((it) => it.productId))];
    const priceMap = await this.loadLastPriceMap(user.organizationId, productIds);
    let total: Prisma.Decimal | null = null;
    const currCount = new Map<string, number>();
    for (const it of row.items) {
      const price = priceMap.get(it.productId);
      if (price) {
        const cost = new Prisma.Decimal(it.quantity).times(price.unitPrice);
        total = (total ?? new Prisma.Decimal(0)).plus(cost);
        currCount.set(price.currency, (currCount.get(price.currency) ?? 0) + 1);
      }
    }
    const currency = [...currCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      zone: row.zone,
      createdBy: row.createdBy,
      skuCount: row.items.length,
      totalCost: total ? total.toDecimalPlaces(2).toString() : null,
      currency,
      items: row.items.map((it) => ({
        id: it.id,
        product: { id: it.product.id, name: it.product.name, baseUnit: it.product.baseUnit as unknown as string },
        quantity: it.quantity.toString(),
      })),
    };
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Удаление утилизации доступно только владельцу');
    }
    const row = await this.prisma.disposal.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Утилизация не найдена');
    await this.prisma.disposal.delete({ where: { id } });
  }

  async create(user: AuthUser, dto: CreateDisposalDto): Promise<DisposalDetail> {
    // --- Зона: наша, и для employee — из его UserZone ---
    const zone = await this.prisma.zone.findFirst({
      where: { id: dto.zoneId, organizationId: user.organizationId },
      select: { id: true, isActive: true },
    });
    if (!zone) throw new NotFoundException('Зона не найдена');
    if (user.role === 'employee') {
      const assignment = await this.prisma.userZone.findFirst({
        where: { userId: user.id, zoneId: zone.id },
        select: { id: true },
      });
      if (!assignment) throw new ForbiddenException('Нет доступа к зоне');
    }

    // --- Товары: активные, inventoryTracked, привязаны к этой зоне ---
    const productIds = dto.items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Товар не должен повторяться в утилизации');
    }
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        organizationId: user.organizationId,
        isActive: true,
        isInventoryTracked: true,
        zones: { some: { zoneId: zone.id } },
      },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Один или несколько товаров недоступны для этой зоны');
    }

    const created = await this.prisma.disposal.create({
      data: {
        organizationId: user.organizationId,
        zoneId: zone.id,
        createdById: user.id,
        items: {
          create: dto.items.map((it) => ({
            productId: it.productId,
            quantity: new Prisma.Decimal(it.quantity),
          })),
        },
      },
      select: { id: true },
    });

    return this.get(user, created.id);
  }
}
