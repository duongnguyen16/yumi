import { Module } from '@nestjs/common';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { RtStrategy } from 'src/common/guard/rt.strategy';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SchemaModule } from 'src/common/schemas/schema.module';

@Module({
  providers: [AtStrategy, RtStrategy, ProductsService],
  controllers: [ProductsController],
  imports: [SchemaModule],
})
export class ProductsModule {}
