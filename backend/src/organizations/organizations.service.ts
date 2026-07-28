import { Injectable, NotFoundException } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(id: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Организация не найдена');
    return org;
  }

  async update(id: string, input: { name?: string; description?: string | null }): Promise<Organization> {
    await this.get(id);
    const data: Prisma.OrganizationUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description === '' ? null : input.description;
    return this.prisma.organization.update({ where: { id }, data });
  }
}
