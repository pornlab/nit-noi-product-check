import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Supplier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPrismaUniqueConstraintError, normalizeName } from '../common/normalize-name';

export type SupplierPublic = Omit<Supplier, 'normalizedName' | 'organizationId'>;

function toPublic(supplier: Supplier): SupplierPublic {
  const { normalizedName: _n, organizationId: _o, ...rest } = supplier;
  return rest;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    orgId: string,
    filter: { isActive?: boolean; search?: string },
  ): Promise<SupplierPublic[]> {
    const where: Prisma.SupplierWhereInput = { organizationId: orgId };
    if (typeof filter.isActive === 'boolean') where.isActive = filter.isActive;
    if (filter.search && filter.search.trim().length > 0) {
      const s = filter.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { contactPerson: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { taxId: { contains: s, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.supplier.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { createdAt: 'asc' }],
    });
    return items.map(toPublic);
  }

  async get(orgId: string, id: string): Promise<SupplierPublic> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!supplier) throw new NotFoundException('Поставщик не найден');
    return toPublic(supplier);
  }

  async create(
    orgId: string,
    input: {
      name: string;
      contactPerson?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      taxId?: string | null;
      notes?: string | null;
    },
  ): Promise<SupplierPublic> {
    const name = input.name.trim();
    const normalizedName = normalizeName(name);
    try {
      const created = await this.prisma.supplier.create({
        data: {
          organizationId: orgId,
          name,
          normalizedName,
          contactPerson: input.contactPerson ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          address: input.address ?? null,
          taxId: input.taxId ?? null,
          notes: input.notes ?? null,
        },
      });
      return toPublic(created);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Поставщик с таким названием уже существует');
      }
      throw error;
    }
  }

  async update(
    orgId: string,
    id: string,
    input: Partial<{
      name: string;
      contactPerson: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      taxId: string | null;
      notes: string | null;
      isActive: boolean;
    }>,
  ): Promise<SupplierPublic> {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Поставщик не найден');

    const data: Prisma.SupplierUpdateInput = {};
    if (input.name !== undefined) {
      const newName = input.name.trim();
      data.name = newName;
      data.normalizedName = normalizeName(newName);
    }
    if (input.contactPerson !== undefined) data.contactPerson = input.contactPerson;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.email !== undefined) data.email = input.email;
    if (input.address !== undefined) data.address = input.address;
    if (input.taxId !== undefined) data.taxId = input.taxId;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    try {
      const updated = await this.prisma.supplier.update({ where: { id }, data });
      return toPublic(updated);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Поставщик с таким названием уже существует');
      }
      throw error;
    }
  }
}
