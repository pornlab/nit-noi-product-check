import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { DisposalsService } from './disposals.service';
import { CreateDisposalDto } from './dto/create-disposal.dto';
import { ListDisposalsQueryDto } from './dto/list-disposals-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('disposals')
export class DisposalsController {
  constructor(private readonly service: DisposalsService) {}

  @Get()
  @Roles('admin', 'manager', 'employee', 'analytics')
  list(@CurrentUser() user: AuthUser, @Query() q: ListDisposalsQueryDto) {
    return this.service.list(user, q);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'employee', 'analytics')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @Post()
  @Roles('admin', 'manager', 'employee')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDisposalDto) {
    return this.service.create(user, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.service.remove(user, id);
  }
}
