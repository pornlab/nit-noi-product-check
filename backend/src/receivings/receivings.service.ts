import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';
import type { CreateReceivingDto } from './dto/create-receiving.dto';

const EPS = 1e-6; // допуск при сравнении сумм Decimal(12,3)

/** Yesterday в UTC. Manager может ставить дату не раньше вчера. */
function yesterdayUtcDateStr(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Извлекает YYYY-MM-DD из ISO-строки. Отбрасывает время/таймзону. */
function extractDate(iso: string): string {
  return iso.slice(0, 10);
}

export interface ReceivingSummary {
  id: string;
  sequenceNumber: number;
  receivedAt: string;
  createdAt: string;
  currency: string;
  supplier: { id: string; name: string };
  createdBy: { id: string; name: string };
  positionsCount: number;
  zonesCount: number;
  itemsTotalCost: string;
  deliveryCost: string;
  grandTotal: string;
}

export interface ReceivingDetail {
  id: string;
  sequenceNumber: number;
  receivedAt: string;
  createdAt: string;
  currency: string;
  supplier: { id: string; name: string };
  createdBy: { id: string; name: string; role: string };
  deliveryCost: string;
  itemsTotalCost: string;
  grandTotal: string;
  items: Array<{
    id: string;
    product: { id: string; name: string; baseUnit: string };
    quantity: string;
    cost: string;
    allocations: Array<{ id: string; zone: { id: string; name: string }; quantity: string }>;
  }>;
}

@Injectable()
export class ReceivingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser): Promise<ReceivingSummary[]> {
    const rows = await this.prisma.receiving.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ receivedAt: 'desc' }, { sequenceNumber: 'desc' }],
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        items: {
          select: {
            cost: true,
            allocations: { select: { zoneId: true } },
          },
        },
      },
    });

    return rows.map((r) => {
      const zoneIds = new Set<string>();
      let itemsTotal = new Prisma.Decimal(0);
      for (const it of r.items) {
        itemsTotal = itemsTotal.plus(it.cost);
        for (const a of it.allocations) zoneIds.add(a.zoneId);
      }
      const grand = itemsTotal.plus(r.deliveryCost);
      return {
        id: r.id,
        sequenceNumber: r.sequenceNumber,
        receivedAt: extractDate(r.receivedAt.toISOString()),
        createdAt: r.createdAt.toISOString(),
        currency: r.currency,
        supplier: r.supplier,
        createdBy: r.createdBy,
        positionsCount: r.items.length,
        zonesCount: zoneIds.size,
        itemsTotalCost: itemsTotal.toString(),
        deliveryCost: r.deliveryCost.toString(),
        grandTotal: grand.toString(),
      };
    });
  }

  async get(user: AuthUser, id: string): Promise<ReceivingDetail> {
    const r = await this.prisma.receiving.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, baseUnit: true } },
            allocations: {
              include: { zone: { select: { id: true, name: true } } },
              orderBy: { zone: { name: 'asc' } },
            },
          },
          orderBy: { product: { name: 'asc' } },
        },
      },
    });
    if (!r) throw new NotFoundException('Поступление не найдено');
    const itemsTotal = r.items.reduce((s, it) => s.plus(it.cost), new Prisma.Decimal(0));
    const grand = itemsTotal.plus(r.deliveryCost);
    return {
      id: r.id,
      sequenceNumber: r.sequenceNumber,
      receivedAt: extractDate(r.receivedAt.toISOString()),
      createdAt: r.createdAt.toISOString(),
      currency: r.currency,
      supplier: r.supplier,
      createdBy: r.createdBy,
      deliveryCost: r.deliveryCost.toString(),
      itemsTotalCost: itemsTotal.toString(),
      grandTotal: grand.toString(),
      items: r.items.map((it) => ({
        id: it.id,
        product: { id: it.product.id, name: it.product.name, baseUnit: it.product.baseUnit as unknown as string },
        quantity: it.quantity.toString(),
        cost: it.cost.toString(),
        allocations: it.allocations.map((a) => ({
          id: a.id,
          zone: a.zone,
          quantity: a.quantity.toString(),
        })),
      })),
    };
  }

  /**
   * Общая валидация payload'а (используется и на create, и на update).
   * Ничего не возвращает — бросает исключение при первой ошибке.
   */
  private async validatePayload(user: AuthUser, dto: CreateReceivingDto): Promise<void> {
    // Дата: admin (владелец) — любая, manager — не раньше вчера.
    const dateStr = extractDate(dto.receivedAt);
    if (user.role === 'manager' && dateStr < yesterdayUtcDateStr()) {
      throw new BadRequestException('Дата поступления не может быть раньше вчерашней');
    }

    // Поставщик: активный и наш.
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, organizationId: user.organizationId, isActive: true },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException('Активный поставщик не найден');

    // Товары: без дубликатов, активные, inventoryTracked, purchasable, в этой орг.
    const productIds = dto.items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Товар не должен повторяться в поступлении');
    }
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        organizationId: user.organizationId,
        isActive: true,
        isInventoryTracked: true,
        isPurchasable: true,
      },
      include: { zones: { select: { zoneId: true } } },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Один или несколько товаров недоступны для закупки');
    }
    const productById = new Map(products.map((p) => [p.id, p] as const));

    // Аллокации: зоны только из product.zones, без дубликатов, сумма == quantity.
    for (const it of dto.items) {
      const product = productById.get(it.productId)!;
      const allowedZoneIds = new Set(product.zones.map((z) => z.zoneId));
      const seenZoneIds = new Set<string>();
      let sum = 0;
      for (const a of it.allocations) {
        if (seenZoneIds.has(a.zoneId)) {
          throw new BadRequestException('Зона повторяется в распределении');
        }
        seenZoneIds.add(a.zoneId);
        if (!allowedZoneIds.has(a.zoneId)) {
          throw new BadRequestException(`Зона недоступна для товара «${product.name}»`);
        }
        sum += a.quantity;
      }
      if (Math.abs(sum - it.quantity) > EPS) {
        throw new BadRequestException(
          `Сумма распределения (${sum}) не равна количеству (${it.quantity}) для товара «${product.name}»`,
        );
      }
    }
  }

  /** Prisma-nested-input для items+allocations. Нулевые аллокации отбрасываются. */
  private itemsCreateInput(dto: CreateReceivingDto) {
    return dto.items.map((it) => ({
      productId: it.productId,
      quantity: new Prisma.Decimal(it.quantity),
      cost: new Prisma.Decimal(it.cost),
      allocations: {
        create: it.allocations
          .filter((a) => a.quantity > 0)
          .map((a) => ({
            zoneId: a.zoneId,
            quantity: new Prisma.Decimal(a.quantity),
          })),
      },
    }));
  }

  async create(user: AuthUser, dto: CreateReceivingDto): Promise<ReceivingDetail> {
    if (user.role !== 'admin' && user.role !== 'manager') {
      throw new ForbiddenException('Недостаточно прав');
    }
    await this.validatePayload(user, dto);
    const dateStr = extractDate(dto.receivedAt);

    // --- Транзакция: advisory-lock по org для sequenceNumber, затем создание ---
    const created = await this.prisma.$transaction(async (tx) => {
      // per-org lock, чтобы не было гонок за sequenceNumber
      const orgKey = hashStringToBigInt(user.organizationId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${orgKey})`;

      const last = await tx.receiving.findFirst({
        where: { organizationId: user.organizationId },
        orderBy: { sequenceNumber: 'desc' },
        select: { sequenceNumber: true },
      });
      const nextSeq = (last?.sequenceNumber ?? 0) + 1;

      return tx.receiving.create({
        data: {
          organizationId: user.organizationId,
          sequenceNumber: nextSeq,
          supplierId: dto.supplierId,
          receivedAt: new Date(`${dateStr}T00:00:00.000Z`),
          currency: (dto.currency ?? 'THB').toUpperCase(),
          deliveryCost: new Prisma.Decimal(dto.deliveryCost),
          createdById: user.id,
          items: { create: this.itemsCreateInput(dto) },
        },
        select: { id: true },
      });
    });

    return this.get(user, created.id);
  }

  async update(user: AuthUser, id: string, dto: CreateReceivingDto): Promise<ReceivingDetail> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Правка поступления доступна только владельцу');
    }
    const existing = await this.prisma.receiving.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Поступление не найдено');

    await this.validatePayload(user, dto);
    const dateStr = extractDate(dto.receivedAt);

    await this.prisma.$transaction(async (tx) => {
      // Полная замена вложенных сущностей: сначала удаляем items (cascade — allocations),
      // затем создаём заново. Проще, чем diff'ать, а поступление редко правится.
      await tx.receivingItem.deleteMany({ where: { receivingId: id } });
      await tx.receiving.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          receivedAt: new Date(`${dateStr}T00:00:00.000Z`),
          currency: (dto.currency ?? 'THB').toUpperCase(),
          deliveryCost: new Prisma.Decimal(dto.deliveryCost),
          items: { create: this.itemsCreateInput(dto) },
        },
      });
    });

    return this.get(user, id);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Удаление поступления доступно только владельцу');
    }
    const r = await this.prisma.receiving.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!r) throw new NotFoundException('Поступление не найдено');
    await this.prisma.receiving.delete({ where: { id } });
  }
}

/** Простая свёртка cuid/uuid в bigint для pg_advisory_xact_lock. */
function hashStringToBigInt(s: string): bigint {
  let h = 1469598103934665603n; // FNV-1a 64
  const prime = 1099511628211n;
  const mask = (1n << 64n) - 1n;
  for (let i = 0; i < s.length; i++) {
    h = h ^ BigInt(s.charCodeAt(i));
    h = (h * prime) & mask;
  }
  // Преобразуем к знаковому int64 (Postgres bigint).
  const signed = h >= 1n << 63n ? h - (1n << 64n) : h;
  return signed;
}
