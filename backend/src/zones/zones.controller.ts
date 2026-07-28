import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { ZonesService } from './zones.service';
import {
  AssignUserToZoneDto,
  CreateZoneDto,
  ListZonesDto,
  UpdateZoneAssignmentDto,
  UpdateZoneDto,
} from './dto/zone.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('zones')
export class ZonesController {
  constructor(private readonly service: ZonesService) {}

  @Get()
  @Roles('admin', 'manager', 'employee')
  list(@CurrentUser() user: AuthUser, @Query() q: ListZonesDto) {
    return this.service.list(user, {
      isActive: q.isActive === undefined ? undefined : q.isActive === 'true',
      search: q.search,
    });
  }

  @Get(':id')
  @Roles('admin', 'manager', 'employee')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(user, id);
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateZoneDto) {
    return this.service.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZoneDto) {
    return this.service.update(user.organizationId, id, dto);
  }

  @Post(':zoneId/users')
  @Roles('admin')
  assign(
    @CurrentUser() user: AuthUser,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Body() dto: AssignUserToZoneDto,
  ) {
    return this.service.assign(user.organizationId, zoneId, dto);
  }

  @Patch(':zoneId/users/:userId')
  @Roles('admin')
  updateAssignment(
    @CurrentUser() user: AuthUser,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateZoneAssignmentDto,
  ) {
    return this.service.updateAssignment(user.organizationId, zoneId, userId, dto.isResponsible);
  }

  @Delete(':zoneId/users/:userId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassign(
    @CurrentUser() user: AuthUser,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.service.unassign(user.organizationId, zoneId, userId);
  }
}
