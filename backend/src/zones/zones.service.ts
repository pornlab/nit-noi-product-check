import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Zone } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaUniqueConstraintError, normalizeName } from '../common/normalize-name';
import type { AuthUser } from '../auth/auth-user';

export interface ZoneAssignmentView {
  userId: string;
  name: string;
  email: string;
  isResponsible: boolean;
}

export interface ZoneListItem extends Zone {
  usersCount: number;
  responsibleCount: number;
}

export interface ZoneDetail extends ZoneListItem {
  assignments: ZoneAssignmentView[];
}

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, filter: { isActive?: boolean; search?: string }): Promise<ZoneListItem[]> {
    const where: Prisma.ZoneWhereInput = { organizationId: user.organizationId };
    if (typeof filter.isActive === 'boolean') where.isActive = filter.isActive;
    if (filter.search) where.name = { contains: filter.search, mode: 'insensitive' };
    if (user.role === 'employee') where.users = { some: { userId: user.id } };

    const zones = await this.prisma.zone.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true } },
        users: { where: { isResponsible: true }, select: { id: true } },
      },
    });
    return zones.map(({ _count, users, ...z }) => ({
      ...z,
      usersCount: _count.users,
      responsibleCount: users.length,
    }));
  }

  async get(user: AuthUser, id: string): Promise<ZoneDetail> {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
        users: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!zone || zone.organizationId !== user.organizationId) {
      throw new NotFoundException('Зона не найдена');
    }
    if (user.role === 'employee' && !zone.users.some((uz) => uz.userId === user.id)) {
      throw new NotFoundException('Зона не найдена');
    }
    const responsibleCount = zone.users.filter((uz) => uz.isResponsible).length;
    const { _count, users, ...rest } = zone;
    return {
      ...rest,
      usersCount: _count.users,
      responsibleCount,
      assignments: users.map((uz) => ({
        userId: uz.user.id,
        name: uz.user.name,
        email: uz.user.email,
        isResponsible: uz.isResponsible,
      })),
    };
  }

  async create(orgId: string, input: { name: string; description?: string | null }): Promise<ZoneListItem> {
    const name = input.name.trim();
    const normalizedName = normalizeName(name);
    try {
      const zone = await this.prisma.zone.create({
        data: {
          organizationId: orgId,
          name,
          normalizedName,
          description: input.description ?? null,
        },
      });
      return { ...zone, usersCount: 0, responsibleCount: 0 };
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Зона с таким названием уже существует');
      }
      throw error;
    }
  }

  async update(
    orgId: string,
    id: string,
    input: { name?: string; description?: string | null; isActive?: boolean },
  ): Promise<ZoneListItem> {
    const existing = await this.prisma.zone.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== orgId) throw new NotFoundException('Зона не найдена');

    const data: Prisma.ZoneUpdateInput = {};
    if (input.name !== undefined) {
      const newName = input.name.trim();
      data.name = newName;
      data.normalizedName = normalizeName(newName);
    }
    if (input.description !== undefined) data.description = input.description === '' ? null : input.description;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    try {
      await this.prisma.zone.update({ where: { id }, data });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Зона с таким названием уже существует');
      }
      throw error;
    }
    const refreshed = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
        users: { where: { isResponsible: true }, select: { id: true } },
      },
    });
    if (!refreshed) throw new NotFoundException('Зона не найдена');
    const { _count, users, ...rest } = refreshed;
    return { ...rest, usersCount: _count.users, responsibleCount: users.length };
  }

  async assign(
    orgId: string,
    zoneId: string,
    input: { userId: string; isResponsible?: boolean },
  ): Promise<ZoneAssignmentView> {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone || zone.organizationId !== orgId) throw new NotFoundException('Зона не найдена');
    if (!zone.isActive) throw new BadRequestException('Нельзя назначать в деактивированную зону');

    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user || user.organizationId !== orgId) throw new NotFoundException('Пользователь не найден');
    if (!user.isActive) throw new BadRequestException('Нельзя назначить деактивированного пользователя');

    const existing = await this.prisma.userZone.findUnique({
      where: { userId_zoneId: { userId: user.id, zoneId } },
    });
    if (existing) throw new ConflictException('Пользователь уже назначен на эту зону');

    await this.prisma.userZone.create({
      data: { userId: user.id, zoneId, isResponsible: input.isResponsible ?? false },
    });

    return { userId: user.id, name: user.name, email: user.email, isResponsible: input.isResponsible ?? false };
  }

  async updateAssignment(
    orgId: string,
    zoneId: string,
    userId: string,
    isResponsible: boolean,
  ): Promise<ZoneAssignmentView> {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone || zone.organizationId !== orgId) throw new NotFoundException('Зона не найдена');

    const existing = await this.prisma.userZone.findUnique({
      where: { userId_zoneId: { userId, zoneId } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!existing) throw new NotFoundException('Назначение не найдено');
    await this.prisma.userZone.update({
      where: { userId_zoneId: { userId, zoneId } },
      data: { isResponsible },
    });
    return {
      userId: existing.user.id,
      name: existing.user.name,
      email: existing.user.email,
      isResponsible,
    };
  }

  async unassign(orgId: string, zoneId: string, userId: string): Promise<void> {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone || zone.organizationId !== orgId) throw new NotFoundException('Зона не найдена');
    const existing = await this.prisma.userZone.findUnique({
      where: { userId_zoneId: { userId, zoneId } },
    });
    if (!existing) throw new NotFoundException('Назначение не найдено');
    await this.prisma.userZone.delete({ where: { userId_zoneId: { userId, zoneId } } });
  }

}
