import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from 'src/common/schemas/category.schema';
import {
  SubCategory,
  SubCategoryDocument,
} from 'src/common/schemas/sub-category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private CategoryModel: Model<CategoryDocument>,
    @InjectModel(SubCategory.name)
    private SubCategoryModel: Model<SubCategoryDocument>,
  ) {}

  async getAllCategory() {
    try {
      const result = await this.CategoryModel.find({ isActive: true });
      if (!result) {
        return {
          success: false,
          statusCode: 404,
          message: 'Không tồn tại',
        };
      }
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        statusCode: 500,
        message: 'Đã xảy ra lỗi',
      };
    }
  }

  async getSubCategory(categoryId: string) {
    try {
      console.log(categoryId);
      const result = await this.SubCategoryModel.find({
        categoryId: categoryId,
        isActive: true,
      });
      if (!result) {
        return {
          success: false,
          statusCode: 404,
        };
      }
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.log('Error at getSubCategory: ', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Đã xảy ra lỗi',
      };
    }
  }
}
