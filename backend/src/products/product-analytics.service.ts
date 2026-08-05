import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';

export interface ProductAnalyticsOperation {
  date: string;
  type: 'inventory' | 'receiving' | 'disposal';
  quantity: string;             // подписанное: приходы +, утилизации -, инвентаризации абсолютное
  cost: string | null;          // для приходов cost позиции; для утилизаций qty×lastPrice
  currency: string | null;
  zone: { id: string; name: string } | null;
  user: { id: string; name: string; role: string } | null;
  docRef: string;               // ПН-000001 / WO-<id short> / INV-001
}

export interface ProductAnalyticsSummary {
  product: { id: string; name: string; sku: string | null; baseUnit: string; isActive: boolean; category: { id: string; name: string } | null };
  period: { from: string; to: string };
  currentStock: { quantity: string; asOf: string };                     // qty = last inv + receipts after − disposals after
  currentStockValue: { amount: string; unitPrice: string | null; currency: string | null };
  received: { quantity: string; cost: string; count: number };          // всё в диапазоне
  disposed: { quantity: string; cost: string | null; count: number };
  discrepancy: { quantity: string; date: string } | null;                // фактическая инв. − ожидаемая
  operations: ProductAnalyticsOperation[];                              // все операции в диапазоне, свежие сверху
}

function dayRange(from?: string, to?: string): { gte: Date; lte: Date } {
  const gte = from ? new Date(`${from.slice(0, 10)}T00:00:00.000Z`) : new Date('2000-01-01T00:00:00.000Z');
  const lte = to ? new Date(`${to.slice(0, 10)}T23:59:59.999Z`) : new Date();
  return { gte, lte };
}

@Injectable()
export class ProductAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthUser, productId: string, from?: string, to?: string): Promise<ProductAnalyticsSummary> {
    if (user.role !== 'admin' && user.role !== 'analytics') {
      throw new ForbiddenException('Аналитика доступна только владельцу');
    }
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId: user.organizationId },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundException('Товар не найден');

    const range = dayRange(from, to);

    // --- Последняя цена (для стоимости остатка и оценки утилизаций) ---
    const lastPrice = await this.loadLastPrice(user.organizationId, productId);

    // --- Текущий остаток (M + N − D по всем зонам) ---
    const invRows = await this.prisma.$queryRaw<
      Array<{ zoneId: string; quantity: Prisma.Decimal; completedAt: Date }>
    >`
      SELECT DISTINCT ON (s."zoneId")
        s."zoneId", ii.quantity, s."completedAt"
      FROM "inventory_items" ii
      JOIN "inventory_sessions" s ON s.id = ii."inventorySessionId"
      WHERE s."organizationId" = ${user.organizationId}
        AND s.status = 'COMPLETED' AND s."completedAt" IS NOT NULL
        AND ii."productId" = ${productId}
      ORDER BY s."zoneId", s."completedAt" DESC, s.id DESC
    `;
    // Приходы/утилизации после последней инвентаризации по каждой зоне (или все, если инв не было).
    let stockQty = new Prisma.Decimal(0);
    const invByZone = new Map<string, Date>();
    for (const r of invRows) {
      stockQty = stockQty.plus(r.quantity);
      invByZone.set(r.zoneId, r.completedAt);
    }
    // Зоны, где были движения без инвентаризации.
    const movementZones = await this.prisma.$queryRaw<Array<{ zoneId: string }>>`
      SELECT DISTINCT z FROM (
        SELECT ra."zoneId" AS z
        FROM "receiving_allocations" ra
        JOIN "receiving_items" ri ON ri.id = ra."receivingItemId"
        JOIN "receivings" r ON r.id = ri."receivingId"
        WHERE r."organizationId" = ${user.organizationId} AND ri."productId" = ${productId}
        UNION
        SELECT d."zoneId" AS z
        FROM "disposal_items" di
        JOIN "disposals" d ON d.id = di."disposalId"
        WHERE d."organizationId" = ${user.organizationId} AND di."productId" = ${productId}
      ) t (z)
    `;
    for (const z of movementZones) if (!invByZone.has(z.zoneId)) invByZone.set(z.zoneId, new Date('2000-01-01'));

    // Плюс приходы и минус утилизации после точки среза по каждой зоне.
    const zoneIdsArr = [...invByZone.keys()];
    if (zoneIdsArr.length > 0) {
      const receivedAfter = await this.prisma.$queryRaw<Array<{ zoneId: string; qty: Prisma.Decimal }>>`
        SELECT ra."zoneId" AS "zoneId", SUM(ra.quantity) AS qty
        FROM "receiving_allocations" ra
        JOIN "receiving_items" ri ON ri.id = ra."receivingItemId"
        JOIN "receivings" r ON r.id = ri."receivingId"
        WHERE r."organizationId" = ${user.organizationId}
          AND ri."productId" = ${productId}
          AND ra."zoneId" IN (${Prisma.join(zoneIdsArr)})
        GROUP BY ra."zoneId"
      `;
      for (const row of receivedAfter) {
        const cut = invByZone.get(row.zoneId)!;
        // выбираем только >cut::date
        const q = await this.prisma.$queryRaw<Array<{ qty: Prisma.Decimal }>>`
          SELECT COALESCE(SUM(ra.quantity), 0) AS qty
          FROM "receiving_allocations" ra
          JOIN "receiving_items" ri ON ri.id = ra."receivingItemId"
          JOIN "receivings" r ON r.id = ri."receivingId"
          WHERE r."organizationId" = ${user.organizationId}
            AND ri."productId" = ${productId}
            AND ra."zoneId" = ${row.zoneId}
            AND r."receivedAt" > (${cut})::date
        `;
        stockQty = stockQty.plus(new Prisma.Decimal(q[0]?.qty ?? 0));
      }
      const disposedAfter = await this.prisma.$queryRaw<Array<{ zoneId: string; qty: Prisma.Decimal }>>`
        SELECT d."zoneId" AS "zoneId", COALESCE(SUM(di.quantity), 0) AS qty
        FROM "disposal_items" di
        JOIN "disposals" d ON d.id = di."disposalId"
        WHERE d."organizationId" = ${user.organizationId}
          AND di."productId" = ${productId}
          AND d."zoneId" IN (${Prisma.join(zoneIdsArr)})
        GROUP BY d."zoneId"
      `;
      for (const row of disposedAfter) {
        const cut = invByZone.get(row.zoneId)!;
        const q = await this.prisma.$queryRaw<Array<{ qty: Prisma.Decimal }>>`
          SELECT COALESCE(SUM(di.quantity), 0) AS qty
          FROM "disposal_items" di
          JOIN "disposals" d ON d.id = di."disposalId"
          WHERE d."organizationId" = ${user.organizationId}
            AND di."productId" = ${productId}
            AND d."zoneId" = ${row.zoneId}
            AND d."createdAt" > ${cut}
        `;
        stockQty = stockQty.minus(new Prisma.Decimal(q[0]?.qty ?? 0));
      }
    }
    const stockValue = lastPrice ? stockQty.times(lastPrice.unitPrice).toDecimalPlaces(2) : null;

    // --- Аггрегаты за диапазон: приходы ---
    const recInPeriod = await this.prisma.receivingItem.findMany({
      where: {
        productId,
        receiving: {
          organizationId: user.organizationId,
          receivedAt: { gte: range.gte, lte: range.lte },
        },
      },
      select: {
        quantity: true, cost: true, receiving: { select: { currency: true } },
      },
    });
    const receivedSum = recInPeriod.reduce(
      (acc, it) => ({
        qty: acc.qty.plus(it.quantity),
        cost: acc.cost.plus(it.cost),
      }),
      { qty: new Prisma.Decimal(0), cost: new Prisma.Decimal(0) },
    );

    // --- Аггрегаты за диапазон: утилизации (в стоимости — по последней цене) ---
    const dispInPeriod = await this.prisma.disposalItem.findMany({
      where: {
        productId,
        disposal: {
          organizationId: user.organizationId,
          createdAt: { gte: range.gte, lte: range.lte },
        },
      },
      select: { quantity: true },
    });
    const disposedQty = dispInPeriod.reduce((acc, it) => acc.plus(it.quantity), new Prisma.Decimal(0));
    const disposedCost = lastPrice ? disposedQty.times(lastPrice.unitPrice).toDecimalPlaces(2) : null;

    // --- Расхождение по последней инвентаризации в диапазоне (по всем зонам суммарно) ---
    const discrepancy = await this.computeDiscrepancy(user.organizationId, productId, range);

    // --- Операции за диапазон ---
    const operations = await this.loadOperations(user.organizationId, productId, range, lastPrice);
    operations.sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        baseUnit: product.baseUnit as unknown as string,
        isActive: product.isActive,
        category: product.category ? { id: product.category.id, name: product.category.name } : null,
      },
      period: { from: from ?? range.gte.toISOString().slice(0, 10), to: to ?? range.lte.toISOString().slice(0, 10) },
      currentStock: { quantity: stockQty.toString(), asOf: new Date().toISOString().slice(0, 10) },
      currentStockValue: {
        amount: stockValue ? stockValue.toString() : '0',
        unitPrice: lastPrice ? lastPrice.unitPrice.toString() : null,
        currency: lastPrice?.currency ?? null,
      },
      received: { quantity: receivedSum.qty.toString(), cost: receivedSum.cost.toString(), count: recInPeriod.length },
      disposed: {
        quantity: disposedQty.toString(),
        cost: disposedCost ? disposedCost.toString() : null,
        count: dispInPeriod.length,
      },
      discrepancy,
      operations,
    };
  }

  private async loadLastPrice(orgId: string, productId: string):
    Promise<{ unitPrice: Prisma.Decimal; currency: string } | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{ quantity: Prisma.Decimal; cost: Prisma.Decimal; currency: string }>
    >`
      SELECT ri.quantity, ri.cost, r.currency
      FROM "receiving_items" ri
      JOIN "receivings" r ON r.id = ri."receivingId"
      WHERE r."organizationId" = ${orgId}
        AND ri."productId" = ${productId}
      ORDER BY r."receivedAt" DESC, r.id DESC
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const row = rows[0];
    const q = new Prisma.Decimal(row.quantity);
    if (q.isZero()) return null;
    return { unitPrice: new Prisma.Decimal(row.cost).div(q), currency: row.currency };
  }

  private async computeDiscrepancy(orgId: string, productId: string, range: { gte: Date; lte: Date }) {
    // Самая свежая инвентаризация в диапазоне (по всем зонам продукта — берём сумму).
    const latest = await this.prisma.$queryRaw<
      Array<{ completedAt: Date }>
    >`
      SELECT MAX(s."completedAt") AS "completedAt"
      FROM "inventory_items" ii
      JOIN "inventory_sessions" s ON s.id = ii."inventorySessionId"
      WHERE s."organizationId" = ${orgId}
        AND s.status = 'COMPLETED' AND s."completedAt" IS NOT NULL
        AND ii."productId" = ${productId}
        AND s."completedAt" BETWEEN ${range.gte} AND ${range.lte}
    `;
    const latestAt = latest[0]?.completedAt;
    if (!latestAt) return null;

    // Предыдущая инвентаризация до этой (может быть вне диапазона).
    const prev = await this.prisma.$queryRaw<
      Array<{ completedAt: Date }>
    >`
      SELECT MAX(s."completedAt") AS "completedAt"
      FROM "inventory_items" ii
      JOIN "inventory_sessions" s ON s.id = ii."inventorySessionId"
      WHERE s."organizationId" = ${orgId}
        AND s.status = 'COMPLETED' AND s."completedAt" IS NOT NULL
        AND ii."productId" = ${productId}
        AND s."completedAt" < ${latestAt}
    `;
    const prevAt = prev[0]?.completedAt;
    if (!prevAt) return null;

    // Сумма количеств на latest / prev (по всем зонам, где были).
    const sumAt = async (at: Date): Promise<Prisma.Decimal> => {
      const rows = await this.prisma.$queryRaw<Array<{ qty: Prisma.Decimal }>>`
        SELECT COALESCE(SUM(ii.quantity), 0) AS qty
        FROM (
          SELECT DISTINCT ON (s."zoneId")
            ii.quantity, s."completedAt", s."zoneId"
          FROM "inventory_items" ii
          JOIN "inventory_sessions" s ON s.id = ii."inventorySessionId"
          WHERE s."organizationId" = ${orgId}
            AND s.status = 'COMPLETED' AND s."completedAt" IS NOT NULL
            AND ii."productId" = ${productId}
            AND s."completedAt" <= ${at}
          ORDER BY s."zoneId", s."completedAt" DESC, s.id DESC
        ) ii
      `;
      return new Prisma.Decimal(rows[0]?.qty ?? 0);
    };
    const latestQty = await sumAt(latestAt);
    const prevQty = await sumAt(prevAt);

    // Приходы и утилизации в интервале (prevAt, latestAt] по всем зонам продукта.
    const inR = await this.prisma.$queryRaw<Array<{ qty: Prisma.Decimal }>>`
      SELECT COALESCE(SUM(ra.quantity), 0) AS qty
      FROM "receiving_allocations" ra
      JOIN "receiving_items" ri ON ri.id = ra."receivingItemId"
      JOIN "receivings" r ON r.id = ri."receivingId"
      WHERE r."organizationId" = ${orgId}
        AND ri."productId" = ${productId}
        AND r."receivedAt" > (${prevAt})::date
        AND r."receivedAt" <= (${latestAt})::date
    `;
    const inD = await this.prisma.$queryRaw<Array<{ qty: Prisma.Decimal }>>`
      SELECT COALESCE(SUM(di.quantity), 0) AS qty
      FROM "disposal_items" di
      JOIN "disposals" d ON d.id = di."disposalId"
      WHERE d."organizationId" = ${orgId}
        AND di."productId" = ${productId}
        AND d."createdAt" > ${prevAt}
        AND d."createdAt" <= ${latestAt}
    `;
    const received = new Prisma.Decimal(inR[0]?.qty ?? 0);
    const disposed = new Prisma.Decimal(inD[0]?.qty ?? 0);
    const expected = prevQty.plus(received).minus(disposed);
    const diff = latestQty.minus(expected);
    return { quantity: diff.toString(), date: latestAt.toISOString().slice(0, 10) };
  }

  private async loadOperations(
    orgId: string,
    productId: string,
    range: { gte: Date; lte: Date },
    lastPrice: { unitPrice: Prisma.Decimal; currency: string } | null,
  ): Promise<ProductAnalyticsOperation[]> {
    const ops: ProductAnalyticsOperation[] = [];

    // Приходы
    const rec = await this.prisma.receivingItem.findMany({
      where: {
        productId,
        receiving: { organizationId: orgId, receivedAt: { gte: range.gte, lte: range.lte } },
      },
      include: {
        receiving: { select: { id: true, receivedAt: true, sequenceNumber: true, currency: true, createdBy: { select: { id: true, name: true, role: true } } } },
        allocations: {
          include: { zone: { select: { id: true, name: true } } },
        },
      },
    });
    for (const r of rec) {
      // По распределению может быть несколько зон — но операция одна, зона — «первая» или пусто.
      const zone = r.allocations[0]?.zone ?? null;
      ops.push({
        date: r.receiving.receivedAt.toISOString().slice(0, 10),
        type: 'receiving',
        quantity: `+${r.quantity.toString()}`,
        cost: r.cost.toString(),
        currency: r.receiving.currency,
        zone,
        user: r.receiving.createdBy,
        docRef: `ПН-${String(r.receiving.sequenceNumber).padStart(6, '0')}`,
      });
    }

    // Утилизации
    const disp = await this.prisma.disposalItem.findMany({
      where: {
        productId,
        disposal: { organizationId: orgId, createdAt: { gte: range.gte, lte: range.lte } },
      },
      include: {
        disposal: { select: { id: true, createdAt: true, zone: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true, role: true } } } },
      },
    });
    for (const d of disp) {
      const cost = lastPrice ? new Prisma.Decimal(d.quantity).times(lastPrice.unitPrice).toDecimalPlaces(2).toString() : null;
      ops.push({
        date: d.disposal.createdAt.toISOString(),
        type: 'disposal',
        quantity: `-${d.quantity.toString()}`,
        cost,
        currency: lastPrice?.currency ?? null,
        zone: d.disposal.zone,
        user: d.disposal.createdBy,
        docRef: `WO-${d.disposal.id.slice(-6).toUpperCase()}`,
      });
    }

    // Инвентаризации (одна запись = одна позиция товара в сессии; в таблице показываем «расхождение» от expected — здесь оставим абсолютное qty, диф считаем на карточке отдельно)
    const inv = await this.prisma.inventoryItem.findMany({
      where: {
        productId,
        session: {
          organizationId: orgId,
          status: 'COMPLETED',
          completedAt: { gte: range.gte, lte: range.lte },
        },
      },
      include: {
        session: {
          select: {
            id: true, sequenceNumber: true, completedAt: true,
            zone: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });
    for (const i of inv) {
      ops.push({
        date: (i.session.completedAt ?? new Date()).toISOString(),
        type: 'inventory',
        quantity: i.quantity.toString(),
        cost: lastPrice ? new Prisma.Decimal(i.quantity).times(lastPrice.unitPrice).toDecimalPlaces(2).toString() : null,
        currency: lastPrice?.currency ?? null,
        zone: i.session.zone,
        user: i.session.createdBy,
        docRef: `INV-${String(i.session.sequenceNumber).padStart(3, '0')}`,
      });
    }

    return ops;
  }
}
