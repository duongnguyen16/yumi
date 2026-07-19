import { IsMongoId, IsString, MaxLength, MinLength } from 'class-validator';

export class ReplyReviewDto {
  @IsString({ message: 'Dữ liệu không hợp lệ' })
  @MaxLength(1000, { message: 'Số lượng ký tự không hợp lệ' })
  @MinLength(1, { message: 'Số lượng ký tự không hợp lệ' })
  content!: string;

  @IsMongoId({ message: 'Dữ liệu không hợp lệ' })
  reviewId!: string;
}
