import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CollectorService } from './collector.service';
import { CollectorListQueryDto } from './dto/list-query.dto';

interface CollectorRequest extends Request {
  collectorOrgId?: string;
}

@UseGuards(ApiKeyGuard)
@Controller('api/v1/collector')
export class CollectorController {
  constructor(private readonly service: CollectorService) {}

  @Get('zones')
  zones(@Req() req: CollectorRequest) {
    return this.service.zones(req.collectorOrgId!);
  }

  @Get('suppliers')
  suppliers(@Req() req: CollectorRequest) {
    return this.service.suppliers(req.collectorOrgId!);
  }

  @Get('products')
  products(@Req() req: CollectorRequest) {
    return this.service.products(req.collectorOrgId!);
  }

  @Get('inventory-sessions')
  inventorySessions(@Req() req: CollectorRequest, @Query() q: CollectorListQueryDto) {
    return this.service.inventorySessions(req.collectorOrgId!, q);
  }

  @Get('receivings')
  receivings(@Req() req: CollectorRequest, @Query() q: CollectorListQueryDto) {
    return this.service.receivings(req.collectorOrgId!, q);
  }

  @Get('disposals')
  disposals(@Req() req: CollectorRequest, @Query() q: CollectorListQueryDto) {
    return this.service.disposals(req.collectorOrgId!, q);
  }
}
