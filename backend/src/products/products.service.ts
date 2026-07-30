import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product, Unit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaUniqueConstraintError, normalizeName } from '../common/normalize-name';

export interface ProductPublicCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ProductStockZoneEntry {
  zoneId: string;
  zoneName: string;
  quantity: string;
  completedAt: string;
}

export interface ProductPublicZone {
  id: string;
  name: string;
}

export interface ProductPublic {
  id: string;
  name: string;
  description: string | null;
  category: ProductPublicCategory | null;
  baseUnit: Unit;
  sku: string | null;
  barcode: string | null;
  isInventoryTracked: boolean;
  isPurchasable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  zones: ProductPublicZone[];
  lastQuantity: string | null;
  lastInventoryAt: string | null;
  lastStock: ProductStockZoneEntry[];
}

type ProductWithCategory = Product & {
  category: { id: string; name: string; isActive: boolean } | null;
  zones?: Array<{ zone: { id: string; name: string } }>;
};

function toPublic(
  p: ProductWithCategory,
  extra?: { lastQuantity: string | null; lastInventoryAt: string | null; lastStock: ProductStockZoneEntry[] },
): ProductPublic {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category ? { id: p.category.id, name: p.category.name, isActive: p.category.isActive } : null,
    baseUnit: p.baseUnit,
    sku: p.sku,
    barcode: p.barcode,
    isInventoryTracked: p.isInventoryTracked,
    isPurchasable: p.isPurchasable,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    zones: (p.zones ?? []).map((z) => ({ id: z.zone.id, name: z.zone.name })),
    lastQuantity: extra?.lastQuantity ?? null,
    lastInventoryAt: extra?.lastInventoryAt ?? null,
    lastStock: extra?.lastStock ?? [],
  };
}

function normalizeSku(value: string): string {
  return normalizeName(value);
}
function normalizeBarcode(value: string): string {
  return value.trim().toLowerCase();
}

function mapConflict(error: unknown): never {
  if (isPrismaUniqueConstraintError(error)) {
    const target = ((error as { meta?: { target?: string[] } }).meta?.target ?? []) as string[];
    if (target.includes('normalizedSku')) {
      throw new ConflictException('Товар с таким артикулом уже существует');
    }
    if (target.includes('normalizedBarcode')) {
      throw new ConflictException('Товар с таким штрихкодом уже существует');
    }
    throw new ConflictException('Товар с таким названием уже существует');
  }
  throw error as Error;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    orgId: string,
    filter: {
      search?: string;
      categoryId?: string;
      zoneId?: string;
      baseUnit?: Unit;
      isInventoryTracked?: boolean;
      isPurchasable?: boolean;
      isActive?: boolean;
    },
  ): Promise<ProductPublic[]> {
    const where: Prisma.ProductWhereInput = { organizationId: orgId };

    if (filter.categoryId === 'none') {
      where.categoryId = null;
    } else if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }
    if (filter.zoneId) {
      where.zones = { some: { zoneId: filter.zoneId, zone: { organizationId: orgId } } };
    }
    if (filter.baseUnit) where.baseUnit = filter.baseUnit;
    if (typeof filter.isInventoryTracked === 'boolean') where.isInventoryTracked = filter.isInventoryTracked;
    if (typeof filter.isPurchasable === 'boolean') where.isPurchasable = filter.isPurchasable;
    if (typeof filter.isActive === 'boolean') where.isActive = filter.isActive;

    if (filter.search && filter.search.trim().length > 0) {
      const s = filter.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { barcode: { contains: s, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.product.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        category: { select: { id: true, name: true, isActive: true } },
        zones: {
          include: { zone: { select: { id: true, name: true } } },
          orderBy: { zone: { name: 'asc' } },
        },
      },
    });

    const extraMap = await this.loadLastInventoryMap(orgId, items.map((it) => it.id));
    return items.map((it) => toPublic(it, extraMap.get(it.id)));
  }

  /**
   * Для набора продуктов организации возвращает per-product:
   *  - lastQuantity: сумма последних инвентаризованных количеств по всем зонам, где товар назначен;
   *  - lastInventoryAt: максимальный completedAt среди этих последних инвентаризаций.
   * Один запрос через $queryRaw, без N+1.
   */
  private async loadLastInventoryMap(
    orgId: string,
    productIds: string[],
  ): Promise<Map<string, { lastQuantity: string; lastInventoryAt: string; lastStock: ProductStockZoneEntry[] }>> {
    const result = new Map<string, { lastQuantity: string; lastInventoryAt: string; lastStock: ProductStockZoneEntry[] }>();
    if (productIds.length === 0) return result;

    // Одна выборка: для каждой пары (product, zone) — самая свежая COMPLETED сессия.
    const rows = await this.prisma.$queryRaw<
      Array<{ productId: string; zoneId: string; zoneName: string; quantity: Prisma.Decimal; completedAt: Date }>
    >`
      SELECT
        latest."productId",
        latest."zoneId",
        z."name"          AS "zoneName",
        latest.quantity,
        latest."completedAt"
      FROM (
        SELECT DISTINCT ON (ii."productId", s."zoneId")
          ii."productId", s."zoneId", ii.quantity, s."completedAt"
        FROM "inventory_items" ii
        JOIN "inventory_sessions" s ON s.id = ii."inventorySessionId"
        WHERE s."organizationId" = ${orgId}
          AND s."status" = 'COMPLETED'
          AND s."completedAt" IS NOT NULL
          AND ii."productId" IN (${Prisma.join(productIds)})
        ORDER BY ii."productId", s."zoneId", s."completedAt" DESC, s."id" DESC
      ) latest
      JOIN "zones" z ON z.id = latest."zoneId"
      ORDER BY latest."productId", z."name"
    `;

    // Группируем по productId
    const grouped = new Map<string, ProductStockZoneEntry[]>();
    for (const r of rows) {
      const arr = grouped.get(r.productId) ?? [];
      arr.push({
        zoneId: r.zoneId,
        zoneName: r.zoneName,
        quantity: r.quantity.toString(),
        completedAt: r.completedAt.toISOString(),
      });
      grouped.set(r.productId, arr);
    }

    for (const [productId, entries] of grouped) {
      const totalQty = entries.reduce((s, e) => s + Number(e.quantity), 0);
      const maxAt = entries.reduce((m, e) => (e.completedAt > m ? e.completedAt : m), entries[0].completedAt);
      result.set(productId, {
        lastQuantity: String(totalQty),
        lastInventoryAt: maxAt,
        lastStock: entries,
      });
    }
    return result;
  }

  async get(orgId: string, id: string): Promise<ProductPublic> {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId: orgId },
      include: {
        category: { select: { id: true, name: true, isActive: true } },
        zones: {
          include: { zone: { select: { id: true, name: true } } },
          orderBy: { zone: { name: 'asc' } },
        },
      },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    return toPublic(product);
  }

  private async assertZonesBelongToOrg(orgId: string, zoneIds: string[]): Promise<void> {
    if (zoneIds.length === 0) return;
    const found = await this.prisma.zone.findMany({
      where: { id: { in: zoneIds }, organizationId: orgId },
      select: { id: true },
    });
    if (found.length !== zoneIds.length) {
      throw new NotFoundException('Одна или несколько зон не найдены');
    }
  }

  async create(
    orgId: string,
    input: {
      name: string;
      description?: string | null;
      categoryId?: string | null;
      baseUnit: Unit;
      sku?: string | null;
      barcode?: string | null;
      isInventoryTracked?: boolean;
      isPurchasable?: boolean;
      zoneIds?: string[];
    },
  ): Promise<ProductPublic> {
    if (input.categoryId) {
      await this.assertActiveCategory(orgId, input.categoryId);
    }
    const zoneIds = input.zoneIds ?? [];
    if (zoneIds.length > 0) {
      await this.assertZonesBelongToOrg(orgId, zoneIds);
    }

    const name = input.name.trim();
    const sku = input.sku ?? null;
    const barcode = input.barcode ?? null;

    try {
      const created = await this.prisma.product.create({
        data: {
          organizationId: orgId,
          categoryId: input.categoryId ?? null,
          name,
          normalizedName: normalizeName(name),
          description: input.description ?? null,
          baseUnit: input.baseUnit,
          sku,
          normalizedSku: sku ? normalizeSku(sku) : null,
          barcode,
          normalizedBarcode: barcode ? normalizeBarcode(barcode) : null,
          isInventoryTracked: input.isInventoryTracked ?? true,
          isPurchasable: input.isPurchasable ?? true,
          zones: zoneIds.length > 0
            ? { create: zoneIds.map((zoneId) => ({ zoneId, organizationId: orgId })) }
            : undefined,
        },
        include: {
          category: { select: { id: true, name: true, isActive: true } },
          zones: {
            include: { zone: { select: { id: true, name: true } } },
            orderBy: { zone: { name: 'asc' } },
          },
        },
      });
      return toPublic(created);
    } catch (error) {
      mapConflict(error);
    }
  }

  async update(
    orgId: string,
    id: string,
    input: Partial<{
      name: string;
      description: string | null;
      categoryId: string | null;
      baseUnit: Unit;
      sku: string | null;
      barcode: string | null;
      isInventoryTracked: boolean;
      isPurchasable: boolean;
      isActive: boolean;
      zoneIds: string[];
    }>,
  ): Promise<ProductPublic> {
    const existing = await this.prisma.product.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, categoryId: true },
    });
    if (!existing) throw new NotFoundException('Товар не найден');

    if (input.categoryId !== undefined && input.categoryId !== null && input.categoryId !== existing.categoryId) {
      await this.assertActiveCategory(orgId, input.categoryId);
    }
    if (input.zoneIds !== undefined && input.zoneIds.length > 0) {
      await this.assertZonesBelongToOrg(orgId, input.zoneIds);
    }

    const data: Prisma.ProductUpdateInput = {};
    if (input.name !== undefined) {
      const newName = input.name.trim();
      data.name = newName;
      data.normalizedName = normalizeName(newName);
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.baseUnit !== undefined) data.baseUnit = input.baseUnit;
    if (input.sku !== undefined) {
      data.sku = input.sku;
      data.normalizedSku = input.sku ? normalizeSku(input.sku) : null;
    }
    if (input.barcode !== undefined) {
      data.barcode = input.barcode;
      data.normalizedBarcode = input.barcode ? normalizeBarcode(input.barcode) : null;
    }
    if (input.isInventoryTracked !== undefined) data.isInventoryTracked = input.isInventoryTracked;
    if (input.isPurchasable !== undefined) data.isPurchasable = input.isPurchasable;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.categoryId !== undefined) {
      data.category = input.categoryId === null ? { disconnect: true } : { connect: { id: input.categoryId } };
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id }, data });
        if (input.zoneIds !== undefined) {
          await tx.productZone.deleteMany({ where: { productId: id } });
          if (input.zoneIds.length > 0) {
            await tx.productZone.createMany({
              data: input.zoneIds.map((zoneId) => ({ productId: id, zoneId, organizationId: orgId })),
              skipDuplicates: true,
            });
          }
        }
        return tx.product.findUniqueOrThrow({
          where: { id },
          include: {
            category: { select: { id: true, name: true, isActive: true } },
            zones: {
              include: { zone: { select: { id: true, name: true } } },
              orderBy: { zone: { name: 'asc' } },
            },
          },
        });
      });
      return toPublic(updated);
    } catch (error) {
      mapConflict(error);
    }
  }

  private async assertActiveCategory(orgId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, organizationId: orgId, isActive: true },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Активная категория не найдена');
  }
}
