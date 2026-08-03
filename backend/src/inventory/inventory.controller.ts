import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('zones')
  @Roles('admin', 'manager', 'employee', 'analytics')
  listZones(@CurrentUser() user: AuthUser) {
    return this.service.listZones(user);
  }

  @Get('zones/:zoneId')
  @Roles('admin', 'manager', 'employee', 'analytics')
  getZone(@CurrentUser() user: AuthUser, @Param('zoneId', ParseUUIDPipe) zoneId: string) {
    return this.service.getZoneInventory(user, zoneId);
  }

  @Get('zones/:zoneId/sessions')
  @Roles('admin', 'manager', 'employee', 'analytics')
  listZoneSessions(@CurrentUser() user: AuthUser, @Param('zoneId', ParseUUIDPipe) zoneId: string) {
    return this.service.listZoneSessions(user, zoneId);
  }

  @Get('sessions/:sessionId')
  @Roles('admin', 'manager', 'employee', 'analytics')
  getSession(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string) {
    return this.service.getSessionDetail(user, sessionId);
  }

  @Patch('sessions/:sessionId/items/:itemId')
  @Roles('admin')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.service.updateItemQuantity(user, sessionId, itemId, dto.quantity);
  }

  @Post()
  @Roles('admin', 'manager', 'employee')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInventoryDto) {
    return this.service.create(user, dto);
  }
}
