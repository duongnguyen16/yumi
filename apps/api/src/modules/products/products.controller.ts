import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VendorGuard } from 'src/common/guard/vendor.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('location/:locationId')
  findByLocation(@Param('locationId') locationId: string) {
    return this.productsService.findByLocation(locationId);
  }

  @Get(':locationId')
  async getAllProductsByLocation(@Param('locationId') locationId: string) {
    return this.productsService.getAllProductsByLocation(locationId);
  }

  @Post('location/:locationId')
  @UseGuards(AuthGuard('jwt-at'), VendorGuard)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async create(
    @Param('locationId') locationId: string,
    @Body('data') data: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    const dto = await this.parseDto(data, CreateProductDto);
    return this.productsService.create(
      locationId,
      req.user.userId,
      dto,
      image,
    );
  }

  @Patch(':productId')
  @UseGuards(AuthGuard('jwt-at'), VendorGuard)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async update(
    @Param('productId') productId: string,
    @Body('data') data: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    const dto = await this.parseDto(data, UpdateProductDto);
    return this.productsService.update(
      productId,
      req.user.userId,
      dto,
      image,
    );
  }

  @Delete(':productId')
  @UseGuards(AuthGuard('jwt-at'), VendorGuard)
  remove(
    @Param('productId') productId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.productsService.remove(productId, req.user.userId);
  }

  private async parseDto<T extends object>(
    data: string,
    dtoType: new () => T,
  ): Promise<T> {
    if (!data) {
      throw new BadRequestException('Thiếu dữ liệu sản phẩm');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new BadRequestException('Dữ liệu sản phẩm không hợp lệ');
    }

    const dto = plainToInstance(dtoType, parsed);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }
}
