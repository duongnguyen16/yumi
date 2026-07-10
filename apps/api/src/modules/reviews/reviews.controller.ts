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
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('location/:locationId')
  getLocationReviews(@Param('locationId') locationId: string) {
    return this.reviewsService.getLocationReviews(locationId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt-at'))
  createReview(
    @Body() dto: CreateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.createReview(req.user.userId, dto);
  }

  @Patch(':reviewId')
  @UseGuards(AuthGuard('jwt-at'))
  updateReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.updateReview(req.user.userId, reviewId, dto);
  }

  @Delete(':reviewId')
  @UseGuards(AuthGuard('jwt-at'))
  deleteReview(
    @Param('reviewId') reviewId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.deleteReview(req.user.userId, reviewId);
  }
}
