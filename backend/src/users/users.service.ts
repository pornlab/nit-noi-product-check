import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  organizationId: string;
  positionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRelations extends PublicUser {
  position: { id: string; name: string } | null;
  zones: Array<{ id: string; name: string; isResponsible: boolean }>;
}

export interface UserFullProfile extends UserWithRelations {
  organization: { id: string; name: string };
}

export interface UsersListFilter {
  role?: Role;
  positionId?: string;
  zoneId?: string;
  isActive?: boolean;
  search?: string;
}

interface CreateInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  positionId?: string | null;
  isActive?: boolean;
}

interface UpdateInput {
  name?: string;
  role?: Role;
  positionId?: string | null;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      organizationId: user.organizationId,
      positionId: user.positionId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findRaw(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async list(orgId: string, filter: UsersListFilter): Promise<UserWithRelations[]> {
    const where: Prisma.UserWhereInput = { organizationId: orgId };
    if (filter.role) where.role = filter.role;
    if (typeof filter.isActive === 'boolean') where.isActive = filter.isActive;
    if (filter.positionId) where.positionId = filter.positionId;
    if (filter.zoneId) where.zones = { some: { zoneId: filter.zoneId } };
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        position: { select: { id: true, name: true } },
        zones: { include: { zone: { select: { id: true, name: true } } } },
      },
    });

    return users.map((u) => ({
      ...this.toPublic(u),
      position: u.position ? { id: u.position.id, name: u.position.name } : null,
      zones: u.zones.map((uz) => ({
        id: uz.zone.id,
        name: uz.zone.name,
        isResponsible: uz.isResponsible,
      })),
    }));
  }

  async getWithRelations(orgId: string, id: string): Promise<UserWithRelations> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        position: { select: { id: true, name: true } },
        zones: { include: { zone: { select: { id: true, name: true } } } },
      },
    });
    if (!user || user.organizationId !== orgId) throw new NotFoundException('Пользователь не найден');
    return {
      ...this.toPublic(user),
      position: user.position ? { id: user.position.id, name: user.position.name } : null,
      zones: user.zones.map((uz) => ({
        id: uz.zone.id,
        name: uz.zone.name,
        isResponsible: uz.isResponsible,
      })),
    };
  }

  async getFullProfile(userId: string): Promise<UserFullProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        zones: { include: { zone: { select: { id: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return {
      ...this.toPublic(user),
      organization: { id: user.organization.id, name: user.organization.name },
      position: user.position ? { id: user.position.id, name: user.position.name } : null,
      zones: user.zones.map((uz) => ({
        id: uz.zone.id,
        name: uz.zone.name,
        isResponsible: uz.isResponsible,
      })),
    };
  }

  async create(orgId: string, input: CreateInput): Promise<UserWithRelations> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email уже используется');

    if (input.positionId) {
      await this.assertPositionUsable(orgId, input.positionId);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const created = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        role: input.role,
        passwordHash,
        organizationId: orgId,
        positionId: input.positionId ?? null,
        isActive: input.isActive ?? true,
      },
    });
    return this.getWithRelations(orgId, created.id);
  }

  async update(current: AuthUser, id: string, input: UpdateInput): Promise<UserWithRelations> {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.organizationId !== current.organizationId) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (input.positionId !== undefined && input.positionId !== null) {
      await this.assertPositionUsable(current.organizationId, input.positionId);
    }

    if (target.id === current.id) {
      if (input.role !== undefined && input.role !== target.role) {
        throw new ForbiddenException('Нельзя изменить собственную роль');
      }
      if (input.isActive === false) {
        throw new ForbiddenException('Нельзя деактивировать самого себя');
      }
    }

    if (target.role === 'admin') {
      const willLoseAdmin =
        (input.role !== undefined && input.role !== 'admin') ||
        input.isActive === false;
      if (willLoseAdmin) {
        await this.assertNotLastActiveAdmin(current.organizationId, target.id);
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.role !== undefined) data.role = input.role;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.positionId !== undefined) {
      data.position = input.positionId === null ? { disconnect: true } : { connect: { id: input.positionId } };
    }

    await this.prisma.user.update({ where: { id }, data });
    return this.getWithRelations(current.organizationId, id);
  }

  async changePassword(orgId: string, id: string, password: string): Promise<void> {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.organizationId !== orgId) {
      throw new NotFoundException('Пользователь не найден');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async replaceZones(
    orgId: string,
    userId: string,
    zones: Array<{ zoneId: string; isResponsible: boolean }>,
  ): Promise<UserWithRelations> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.organizationId !== orgId) throw new NotFoundException('Пользователь не найден');
    if (!user.isActive) throw new BadRequestException('Пользователь неактивен');

    const zoneIds = zones.map((z) => z.zoneId);
    if (zoneIds.length > 0) {
      const orgZones = await this.prisma.zone.findMany({
        where: { id: { in: zoneIds }, organizationId: orgId, isActive: true },
        select: { id: true },
      });
      if (orgZones.length !== zoneIds.length) {
        throw new BadRequestException('Одна или несколько зон недоступны');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userZone.deleteMany({ where: { userId } });
      if (zones.length > 0) {
        await tx.userZone.createMany({
          data: zones.map((z) => ({ userId, zoneId: z.zoneId, isResponsible: z.isResponsible })),
        });
      }
    });

    return this.getWithRelations(orgId, userId);
  }

  private async assertPositionUsable(orgId: string, positionId: string): Promise<void> {
    const position = await this.prisma.position.findUnique({ where: { id: positionId } });
    if (!position || position.organizationId !== orgId) {
      throw new BadRequestException('Должность недоступна');
    }
    if (!position.isActive) {
      throw new BadRequestException('Нельзя назначать деактивированную должность');
    }
  }

  private async assertNotLastActiveAdmin(orgId: string, targetId: string): Promise<void> {
    const activeAdmins = await this.prisma.user.count({
      where: { organizationId: orgId, role: 'admin', isActive: true, NOT: { id: targetId } },
    });
    if (activeAdmins === 0) {
      throw new ConflictException('В организации должен оставаться минимум один активный администратор');
    }
  }
}
