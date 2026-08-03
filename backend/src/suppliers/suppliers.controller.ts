import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @Roles('admin', 'manager', 'analytics')
  list(@CurrentUser() user: AuthUser, @Query() q: SupplierQueryDto) {
    return this.service.list(user.organizationId, { isActive: q.isActive, search: q.search });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'analytics')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user.organizationId, id);
  }

  @Post()
  @Roles('admin', 'manager')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.service.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(user.organizationId, id, dto);
  }
}
