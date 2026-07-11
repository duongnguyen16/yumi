import { Module } from '@nestjs/common';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { VendorGuard } from 'src/common/guard/vendor.guard';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [SchemaModule],
  controllers: [ProductsController],
  providers: [AtStrategy, VendorGuard, ProductsService],
})
export class ProductsModule {}
