import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLocationRequestDataDto {
  @IsString()
  @IsNotEmpty()
  systemCode!: string;

  @IsNumber()
  deviceLatitude!: number;

  @IsNumber()
  deviceLongitude!: number;

  @IsBoolean()
  isPotentialDuplicate!: boolean;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  suspectedDuplicateLocationIds?: string[];

  @IsNumber()
  pinLatitude!: number;

  @IsNumber()
  pinLongitude!: number;

  @IsString()
  @IsDateString({}, { message: 'Thời gian chụp không hợp lệ' })
  captureAt!: string;
}
