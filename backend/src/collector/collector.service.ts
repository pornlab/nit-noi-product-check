import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CollectorListQueryDto } from './dto/list-query.dto';

const DEFAULT_LIMIT = 500;

function rangeFromDto(field: 'createdAt' | 'completedAt' | 'receivedAt', dto: CollectorListQueryDto) {
  const range: { gte?: Date; lte?: Date } = {};
  if (dto.from) range.gte = new Date(`${dto.from.slice(0, 10)}T00:00:00.000Z`);
  if (dto.to) range.lte = new Date(`${dto.to.slice(0, 10)}T23:59:59.999Z`);
  return { [field]: range } as Record<typeof field, typeof range>;
}

@Injectable()
export class CollectorService {
  constructor(private readonly prisma: PrismaService) {}

  async zones(orgId: string) {
    const rows = await this.prisma.zone.findMany({
      where: { organizationId: orgId },
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, description: true, isActive: true, createdAt: true, updatedAt: true },
    });
    return rows.map((z) => ({ ...z, createdAt: z.createdAt.toISOString(), updatedAt: z.updatedAt.toISOString() }));
  }

  async suppliers(orgId: string) {
    const rows = await this.prisma.supplier.findMany({
      where: { organizationId: orgId },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true, name: true, contactPerson: true, phone: true, email: true,
        address: true, taxId: true, notes: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });
    return rows.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() }));
  }

  async products(orgId: string) {
    const rows = await this.prisma.product.findMany({
      where: { organizationId: orgId },
      orderBy: [{ name: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        zones: { select: { zoneId: true } },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category ? { id: p.category.id, name: p.category.name } : null,
      baseUnit: p.baseUnit,
      sku: p.sku,
      barcode: p.barcode,
      isActive: p.isActive,
      isInventoryTracked: p.isInventoryTracked,
      isPurchasable: p.isPurchasable,
      minQuantity: p.minQuantity?.toString() ?? null,
      optimalQuantity: p.optimalQuantity?.toString() ?? null,
      zoneIds: p.zones.map((z) => z.zoneId),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async inventorySessions(orgId: string, dto: CollectorListQueryDto) {
    const where: Prisma.InventorySessionWhereInput = {
      organizationId: orgId,
      status: 'COMPLETED',
      completedAt: { not: null },
      ...(dto.zoneId ? { zoneId: dto.zoneId } : {}),
      ...(dto.from || dto.to ? rangeFromDto('completedAt', dto) : {}),
    };

    const rows = await this.prisma.inventorySession.findMany({
      where,
      orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
      take: dto.limit ?? DEFAULT_LIMIT,
      include: {
        zone: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, baseUnit: true } },
            updatedBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: { product: { name: 'asc' } },
        },
      },
    });

    return rows.map((s) => ({
      id: s.id,
      sequenceNumber: s.sequenceNumber,
      zone: s.zone,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
      createdBy: s.createdBy,
      items: s.items.map((it) => ({
        id: it.id,
        product: { ...it.product, baseUnit: it.product.baseUnit as unknown as string },
        quantity: it.quantity.toString(),
        updatedAt: it.updatedAt.toISOString(),
        updatedBy: it.updatedBy ? { id: it.updatedBy.id, name: it.updatedBy.name, role: it.updatedBy.role } : null,
      })),
    }));
  }

  async receivings(orgId: string, dto: CollectorListQueryDto) {
    const where: Prisma.ReceivingWhereInput = {
      organizationId: orgId,
      ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
      ...(dto.from || dto.to ? rangeFromDto('receivedAt', dto) : {}),
    };

    const rows = await this.prisma.receiving.findMany({
      where,
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
      take: dto.limit ?? DEFAULT_LIMIT,
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

    return rows.map((r) => ({
      id: r.id,
      sequenceNumber: r.sequenceNumber,
      supplier: r.supplier,
      receivedAt: r.receivedAt.toISOString().slice(0, 10),
      currency: r.currency,
      deliveryCost: r.deliveryCost.toString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      createdBy: r.createdBy,
      items: r.items.map((it) => ({
        id: it.id,
        product: { ...it.product, baseUnit: it.product.baseUnit as unknown as string },
        quantity: it.quantity.toString(),
        cost: it.cost.toString(),
        allocations: it.allocations.map((a) => ({
          id: a.id,
          zone: a.zone,
          quantity: a.quantity.toString(),
        })),
      })),
    }));
  }

  async disposals(orgId: string, dto: CollectorListQueryDto) {
    const where: Prisma.DisposalWhereInput = {
      organizationId: orgId,
      ...(dto.zoneId ? { zoneId: dto.zoneId } : {}),
      ...(dto.from || dto.to ? rangeFromDto('createdAt', dto) : {}),
    };

    const rows = await this.prisma.disposal.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: dto.limit ?? DEFAULT_LIMIT,
      include: {
        zone: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: { product: { select: { id: true, name: true, baseUnit: true } } },
          orderBy: { product: { name: 'asc' } },
        },
      },
    });

    return rows.map((d) => ({
      id: d.id,
      zone: d.zone,
      createdAt: d.createdAt.toISOString(),
      createdBy: d.createdBy,
      items: d.items.map((it) => ({
        id: it.id,
        product: { ...it.product, baseUnit: it.product.baseUnit as unknown as string },
        quantity: it.quantity.toString(),
      })),
    }));
  }
}
