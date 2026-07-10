import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { CategoriesService } from './categories.service';
import { SchemaModule } from 'src/common/schemas/schema.module';

@Module({
  controllers: [CategoriesController],
  providers: [AtStrategy, CategoriesService],
  imports: [SchemaModule],
})
export class CategoriesModule {}
