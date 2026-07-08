import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Location,
  LocationDocument,
} from 'src/common/schemas/location.schema';
import { LocationStatus } from 'src/common/schemas/common.enums';
import { Product, ProductDocument } from 'src/common/schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const MAX_PRODUCTS_PER_LOCATION = 50;
const PRICE_DISCLAIMER =
  'Reference price only. Please confirm with the vendor before buying.';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
  ) {}

  async findByLocation(locationId: string) {
    this.assertObjectId(locationId, 'Dia diem khong hop le');

    const locationExists = await this.locationModel.exists({
      _id: new Types.ObjectId(locationId),
      status: LocationStatus.PUBLISHED,
    });
    if (!locationExists) {
      throw new NotFoundException('Khong tim thay dia diem');
    }

    const products = await this.productModel
      .find({ locationId: new Types.ObjectId(locationId) })
      .sort({ createdAt: -1 })
      .exec();

    return {
      success: true,
      products: products.map((product) => this.toResponse(product)),
      priceDisclaimer: PRICE_DISCLAIMER,
    };
  }

  async create(locationId: string, userId: string, dto: CreateProductDto) {
    const location = await this.findOwnedLocation(locationId, userId);
    const productCount = await this.productModel.countDocuments({
      locationId: location._id,
    });

    if (productCount >= MAX_PRODUCTS_PER_LOCATION) {
      throw new BadRequestException('Moi dia diem chi duoc co toi da 50 san pham');
    }

    const product = await this.productModel.create({
      locationId: location._id,
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      imageUrl: dto.imageUrl?.trim() || undefined,
      price: dto.price ?? undefined,
    });

    return {
      success: true,
      message: 'Tao san pham thanh cong',
      product: this.toResponse(product),
    };
  }

  async update(productId: string, userId: string, dto: UpdateProductDto) {
    const product = await this.findProduct(productId);
    await this.findOwnedLocation(String(product.locationId), userId);

    if (dto.name !== undefined) {
      product.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      product.description = dto.description.trim() || undefined;
    }
    if (dto.imageUrl !== undefined) {
      product.imageUrl = dto.imageUrl.trim() || undefined;
    }
    if (dto.price !== undefined) {
      product.price = dto.price ?? undefined;
    }

    await product.save();

    return {
      success: true,
      message: 'Cap nhat san pham thanh cong',
      product: this.toResponse(product),
    };
  }

  async remove(productId: string, userId: string) {
    const product = await this.findProduct(productId);
    await this.findOwnedLocation(String(product.locationId), userId);
    await product.deleteOne();

    return {
      success: true,
      message: 'Xoa san pham thanh cong',
    };
  }

  private async findOwnedLocation(locationId: string, userId: string) {
    this.assertObjectId(locationId, 'Dia diem khong hop le');

    const location = await this.locationModel
      .findById(new Types.ObjectId(locationId))
      .exec();
    if (!location) {
      throw new NotFoundException('Khong tim thay dia diem');
    }

    if (!location.ownerId || String(location.ownerId) !== userId) {
      throw new ForbiddenException('Chi chu so huu dia diem moi duoc sua san pham');
    }

    return location;
  }

  private async findProduct(productId: string) {
    this.assertObjectId(productId, 'San pham khong hop le');

    const product = await this.productModel
      .findById(new Types.ObjectId(productId))
      .exec();
    if (!product) {
      throw new NotFoundException('Khong tim thay san pham');
    }

    return product;
  }

  private assertObjectId(value: string, message: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(message);
    }
  }

  private toResponse(product: ProductDocument) {
    const plain = product.toObject();
    const hasPrice = plain.price !== undefined && plain.price !== null;

    return {
      ...plain,
      _id: String(plain._id),
      id: String(plain._id),
      locationId: String(plain.locationId),
      priceDisclaimer: hasPrice ? PRICE_DISCLAIMER : undefined,
    };
  }
}

export { MAX_PRODUCTS_PER_LOCATION, PRICE_DISCLAIMER };
