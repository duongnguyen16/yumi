import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import { response } from 'express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @Get(':locationId')
  async getAllProductsByLocation(@Param('locationId') locationId: string) {
    const response =
      await this.productService.getAllProductsByLocation(locationId);
    if (!response?.success) {
      return {
        success: false,
        message: response?.message,
        statusCode: response?.statusCode,
      };
    }
    return response;
  }
}
