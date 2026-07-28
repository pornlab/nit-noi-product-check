import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Position, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaUniqueConstraintError, normalizeName } from '../common/normalize-name';

export interface PositionListItem extends Position {
  usersCount: number;
}

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, filter: { isActive?: boolean; search?: string }): Promise<PositionListItem[]> {
    const where: Prisma.PositionWhereInput = { organizationId: orgId };
    if (typeof filter.isActive === 'boolean') where.isActive = filter.isActive;
    if (filter.search) where.name = { contains: filter.search, mode: 'insensitive' };
    const positions = await this.prisma.position.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return positions.map(({ _count, ...p }) => ({ ...p, usersCount: _count.users }));
  }

  async get(orgId: string, id: string): Promise<PositionListItem> {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!position || position.organizationId !== orgId) throw new NotFoundException('Должность не найдена');
    const { _count, ...rest } = position;
    return { ...rest, usersCount: _count.users };
  }

  async create(orgId: string, input: { name: string; description?: string | null }): Promise<PositionListItem> {
    const name = input.name.trim();
    const normalizedName = normalizeName(name);
    try {
      const position = await this.prisma.position.create({
        data: {
          organizationId: orgId,
          name,
          normalizedName,
          description: input.description ?? null,
        },
      });
      return { ...position, usersCount: 0 };
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Должность с таким названием уже существует');
      }
      throw error;
    }
  }

  async update(
    orgId: string,
    id: string,
    input: { name?: string; description?: string | null; isActive?: boolean },
  ): Promise<PositionListItem> {
    const existing = await this.get(orgId, id);

    const data: Prisma.PositionUpdateInput = {};
    if (input.name !== undefined) {
      const newName = input.name.trim();
      data.name = newName;
      data.normalizedName = normalizeName(newName);
    }
    if (input.description !== undefined) data.description = input.description === '' ? null : input.description;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    try {
      await this.prisma.position.update({ where: { id }, data });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Должность с таким названием уже существует');
      }
      throw error;
    }
    return this.get(orgId, id);
  }
}
