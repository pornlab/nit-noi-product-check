import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @Roles('admin', 'manager', 'employee', 'analytics')
  list(@CurrentUser() user: AuthUser, @Query() q: ProductQueryDto) {
    return this.service.list(user, {
      search: q.search,
      categoryId: q.categoryId,
      zoneId: q.zoneId,
      baseUnit: q.baseUnit,
      isInventoryTracked: q.isInventoryTracked,
      isPurchasable: q.isPurchasable,
      isActive: q.isActive,
    });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'analytics')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user.organizationId, id);
  }

  @Post()
  @Roles('admin', 'manager')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.service.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(user.organizationId, id, dto);
  }
}
