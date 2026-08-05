import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductAnalyticsService } from './product-analytics.service';

@Module({
  providers: [ProductsService, ProductAnalyticsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
