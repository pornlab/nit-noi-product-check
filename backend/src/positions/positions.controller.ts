import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PositionsService } from './positions.service';
import { CreatePositionDto, ListPositionsDto, UpdatePositionDto } from './dto/position.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('positions')
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  @Get()
  @Roles('admin', 'manager', 'analytics')
  list(@CurrentUser() user: AuthUser, @Query() q: ListPositionsDto) {
    return this.service.list(user.organizationId, {
      isActive: q.isActive === undefined ? undefined : q.isActive === 'true',
      search: q.search,
    });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'analytics')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(user.organizationId, id);
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePositionDto) {
    return this.service.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePositionDto) {
    return this.service.update(user.organizationId, id, dto);
  }
}
