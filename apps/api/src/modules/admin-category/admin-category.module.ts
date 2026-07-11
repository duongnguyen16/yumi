import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AdminCategoryController } from './admin-category.controller';
import { AdminCategoryService } from './admin-category.service';

@Module({
  imports: [SchemaModule],
  controllers: [AdminCategoryController],
  providers: [AdminCategoryService, AdminGuard],
})
export class AdminCategoryModule {}
