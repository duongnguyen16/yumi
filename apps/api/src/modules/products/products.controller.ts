import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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

  @Post('location/:locationId')
  @UseGuards(AuthGuard('jwt-at'), VendorGuard)
  create(
    @Param('locationId') locationId: string,
    @Body() dto: CreateProductDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.productsService.create(locationId, req.user.userId, dto);
  }

  @Patch(':productId')
  @UseGuards(AuthGuard('jwt-at'), VendorGuard)
  update(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.productsService.update(productId, req.user.userId, dto);
  }

  @Delete(':productId')
  @UseGuards(AuthGuard('jwt-at'), VendorGuard)
  remove(
    @Param('productId') productId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.productsService.remove(productId, req.user.userId);
  }
}
