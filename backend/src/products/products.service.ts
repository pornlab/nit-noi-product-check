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
}

type ProductWithCategory = Product & {
  category: { id: string; name: string; isActive: boolean } | null;
};

function toPublic(p: ProductWithCategory): ProductPublic {
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
      include: { category: { select: { id: true, name: true, isActive: true } } },
    });
    return items.map(toPublic);
  }

  async get(orgId: string, id: string): Promise<ProductPublic> {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId: orgId },
      include: { category: { select: { id: true, name: true, isActive: true } } },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    return toPublic(product);
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
    },
  ): Promise<ProductPublic> {
    if (input.categoryId) {
      await this.assertActiveCategory(orgId, input.categoryId);
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
        },
        include: { category: { select: { id: true, name: true, isActive: true } } },
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
      const updated = await this.prisma.product.update({
        where: { id },
        data,
        include: { category: { select: { id: true, name: true, isActive: true } } },
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
