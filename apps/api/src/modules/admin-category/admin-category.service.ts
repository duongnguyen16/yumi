import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from 'src/common/schemas/category.schema';
import {
  SubCategory,
  SubCategoryDocument,
} from 'src/common/schemas/sub-category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

interface CategoryLean {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SubCategoryLean {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryWithSubs extends CategoryLean {
  subcategories: SubCategoryLean[];
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

@Injectable()
export class AdminCategoryService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(SubCategory.name)
    private subCategoryModel: Model<SubCategoryDocument>,
  ) {}

  async findAll(): Promise<CategoryWithSubs[]> {
    const [categories, subcategories] = await Promise.all([
      this.categoryModel
        .find()
        .sort({ updatedAt: -1 })
        .lean()
        .exec() as Promise<CategoryLean[]>,
      this.subCategoryModel
        .find()
        .sort({ createdAt: 1 })
        .lean()
        .exec() as Promise<SubCategoryLean[]>,
    ]);

    const subsByCategory = new Map<string, SubCategoryLean[]>();
    for (const sub of subcategories) {
      const key = String(sub.categoryId);
      const list = subsByCategory.get(key);
      if (list) {
        list.push(sub);
      } else {
        subsByCategory.set(key, [sub]);
      }
    }

    return categories.map((cat) => ({
      ...cat,
      subcategories: subsByCategory.get(String(cat._id)) ?? [],
    }));
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.categoryModel
      .findOne({ name: dto.name })
      .exec();
    if (existing) {
      throw new ConflictException('Tên danh mục đã tồn tại');
    }
    try {
      return await this.categoryModel.create({
        name: dto.name,
        description: dto.description,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Tên danh mục đã tồn tại');
      }
      throw error;
    }
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    if (dto.name !== undefined && dto.name !== category.name) {
      const taken = await this.categoryModel
        .findOne({ name: dto.name, _id: { $ne: category._id } })
        .exec();
      if (taken) {
        throw new ConflictException('Tên danh mục đã tồn tại');
      }
      category.name = dto.name;
    }
    if (dto.description !== undefined) {
      category.description = dto.description;
    }

    try {
      return await category.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Tên danh mục đã tồn tại');
      }
      throw error;
    }
  }

  async setCategoryStatus(id: string, isActive: boolean) {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
    category.isActive = isActive;
    await category.save();

    if (isActive === false) {
      await this.subCategoryModel
        .updateMany(
          { categoryId: category._id },
          { $set: { isActive: false } },
        )
        .exec();
    }
    return category;
  }

  async createSubCategory(categoryId: string, dto: CreateSubCategoryDto) {
    const category = await this.categoryModel.findById(categoryId).exec();
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const existing = await this.subCategoryModel
      .findOne({ categoryId: category._id, name: dto.name })
      .exec();
    if (existing) {
      throw new ConflictException(
        'Tên danh mục con đã tồn tại trong danh mục này',
      );
    }

    try {
      return await this.subCategoryModel.create({
        categoryId: category._id,
        name: dto.name,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Tên danh mục con đã tồn tại trong danh mục này',
        );
      }
      throw error;
    }
  }

  async updateSubCategory(
    categoryId: string,
    id: string,
    dto: UpdateSubCategoryDto,
  ) {
    const category = await this.categoryModel.findById(categoryId).exec();
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const sub = await this.subCategoryModel
      .findOne({ _id: id, categoryId: category._id })
      .exec();
    if (!sub) {
      throw new NotFoundException('Không tìm thấy danh mục con');
    }

    if (dto.name !== undefined && dto.name !== sub.name) {
      const taken = await this.subCategoryModel
        .findOne({
          categoryId: category._id,
          name: dto.name,
          _id: { $ne: sub._id },
        })
        .exec();
      if (taken) {
        throw new ConflictException(
          'Tên danh mục con đã tồn tại trong danh mục này',
        );
      }
      sub.name = dto.name;
    }

    try {
      return await sub.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Tên danh mục con đã tồn tại trong danh mục này',
        );
      }
      throw error;
    }
  }

  async setSubCategoryStatus(
    categoryId: string,
    id: string,
    isActive: boolean,
  ) {
    const category = await this.categoryModel.findById(categoryId).exec();
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const sub = await this.subCategoryModel
      .findOne({ _id: id, categoryId: category._id })
      .exec();
    if (!sub) {
      throw new NotFoundException('Không tìm thấy danh mục con');
    }

    sub.isActive = isActive;
    await sub.save();
    return sub;
  }
}
