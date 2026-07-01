import {
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';

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
}
