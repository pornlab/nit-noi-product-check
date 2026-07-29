import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaUniqueConstraintError, normalizeName } from '../common/normalize-name';

export type CategoryPublic = Omit<Category, 'normalizedName' | 'organizationId'>;

function toPublic(category: Category): CategoryPublic {
  const { normalizedName: _n, organizationId: _o, ...rest } = category;
  return rest;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    orgId: string,
    filter: { isActive?: boolean; search?: string },
  ): Promise<CategoryPublic[]> {
    const where: Prisma.CategoryWhereInput = { organizationId: orgId };
    if (typeof filter.isActive === 'boolean') where.isActive = filter.isActive;
    if (filter.search && filter.search.trim().length > 0) {
      const s = filter.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.category.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
    return items.map(toPublic);
  }

  async get(orgId: string, id: string): Promise<CategoryPublic> {
    const category = await this.prisma.category.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!category) throw new NotFoundException('Категория не найдена');
    return toPublic(category);
  }

  async create(
    orgId: string,
    input: { name: string; description?: string | null },
  ): Promise<CategoryPublic> {
    const name = input.name.trim();
    const normalizedName = normalizeName(name);
    try {
      const created = await this.prisma.category.create({
        data: {
          organizationId: orgId,
          name,
          normalizedName,
          description: input.description ?? null,
        },
      });
      return toPublic(created);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Категория с таким названием уже существует');
      }
      throw error;
    }
  }

  async update(
    orgId: string,
    id: string,
    input: Partial<{ name: string; description: string | null; isActive: boolean }>,
  ): Promise<CategoryPublic> {
    const existing = await this.prisma.category.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Категория не найдена');

    const data: Prisma.CategoryUpdateInput = {};
    if (input.name !== undefined) {
      const newName = input.name.trim();
      data.name = newName;
      data.normalizedName = normalizeName(newName);
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    try {
      const updated = await this.prisma.category.update({ where: { id }, data });
      return toPublic(updated);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Категория с таким названием уже существует');
      }
      throw error;
    }
  }
}
