import {
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  @Get()
  async getAllCategories() {
    const response = await this.categoriesService.getAllCategory();
    if (!response?.success) {
      if (response?.statusCode === 404) {
        throw new NotFoundException(response?.message);
      }
      if (response?.statusCode === 500) {
        throw new InternalServerErrorException(response.message);
      }
    }
    return response;
  }

  @Get('sub/:categoryId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @UseGuards(AuthGuard('jwt-at'))
  async getSubCategory(@Param('categoryId') categoryId: string) {
    const response = await this.categoriesService.getSubCategory(categoryId);
    if (!response?.success) {
      if (response?.statusCode === 404) {
        throw new NotFoundException(response?.message);
      }
      if (response?.statusCode === 500) {
        throw new InternalServerErrorException(response.message);
      }
    }
    return response;
  }
}
