import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AdminCategoryService } from './admin-category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Controller('admin/categories')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class AdminCategoryController {
  constructor(private readonly service: AdminCategoryService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch(':id/status')
  setCategoryStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.setCategoryStatus(id, dto.isActive);
  }

  @Patch(':id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Post(':categoryId/subcategories')
  createSubCategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateSubCategoryDto,
  ) {
    return this.service.createSubCategory(categoryId, dto);
  }

  @Patch(':categoryId/subcategories/:id/status')
  setSubCategoryStatus(
    @Param('categoryId') categoryId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.service.setSubCategoryStatus(categoryId, id, dto.isActive);
  }

  @Patch(':categoryId/subcategories/:id')
  updateSubCategory(
    @Param('categoryId') categoryId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return this.service.updateSubCategory(categoryId, id, dto);
  }
}
