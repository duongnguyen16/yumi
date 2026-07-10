import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from 'src/common/schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private producModel: Model<ProductDocument>,
  ) {}

  async getAllProductsByLocation(locationId: string) {
    try {
      const products = await this.producModel.find({ locationId });
      return {
        success: true,
        data: products,
      };
    } catch (error) {
      console.log('Error fetching products by location:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi lấy danh sách sản phẩm',
        statusCode: 500,
      };
    }
  }
}
