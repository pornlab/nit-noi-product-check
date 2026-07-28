import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { ReplaceZonesDto } from './dto/replace-zones.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles('admin', 'manager')
  list(@CurrentUser() user: AuthUser, @Query() q: ListUsersDto) {
    return this.users.list(user.organizationId, {
      role: q.role,
      positionId: q.positionId,
      zoneId: q.zoneId,
      isActive: q.isActive === undefined ? undefined : q.isActive === 'true',
      search: q.search,
    });
  }

  @Get(':id')
  @Roles('admin', 'manager')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.getWithRelations(user.organizationId, id);
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user.organizationId, {
      email: dto.email,
      name: dto.name,
      password: dto.password,
      role: dto.role,
      positionId: dto.positionId ?? null,
      isActive: dto.isActive,
    });
  }

  @Patch(':id')
  @Roles('admin')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user, id, dto);
  }

  @Patch(':id/password')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePasswordDto,
  ): Promise<void> {
    await this.users.changePassword(user.organizationId, id, dto.password);
  }

  @Put(':id/zones')
  @Roles('admin')
  replaceZones(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplaceZonesDto,
  ) {
    return this.users.replaceZones(user.organizationId, id, dto.zones);
  }
}
