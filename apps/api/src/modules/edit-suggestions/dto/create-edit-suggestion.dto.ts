import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum EditSuggestionField {
  NAME = 'name',
  ADDRESS = 'address',
  OPENING_HOURS = 'openingHours',
  PHONE = 'phone',
  GEO = 'geo',
  FLAG = 'flag',
}

export enum EditSuggestionFlag {
  PERMANENTLY_CLOSED = 'PERMANENTLY_CLOSED',
  DUPLICATE = 'DUPLICATE',
  NON_EXISTENT = 'NON_EXISTENT',
}

export class SuggestedGeoDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;
}

export class EditSuggestionChangeDto {
  @IsEnum(EditSuggestionField)
  fieldName!: EditSuggestionField;

  @ValidateIf((change: EditSuggestionChangeDto) =>
    [
      EditSuggestionField.NAME,
      EditSuggestionField.ADDRESS,
      EditSuggestionField.OPENING_HOURS,
      EditSuggestionField.PHONE,
    ].includes(change.fieldName),
  )
  @IsString()
  @MaxLength(300)
  textValue?: string;

  @ValidateIf(
    (change: EditSuggestionChangeDto) =>
      change.fieldName === EditSuggestionField.GEO,
  )
  @ValidateNested()
  @Type(() => SuggestedGeoDto)
  geoValue?: SuggestedGeoDto;

  @ValidateIf(
    (change: EditSuggestionChangeDto) =>
      change.fieldName === EditSuggestionField.FLAG,
  )
  @IsEnum(EditSuggestionFlag)
  flagValue?: EditSuggestionFlag;
}

export class CreateEditSuggestionDto {
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => EditSuggestionChangeDto)
  changes!: EditSuggestionChangeDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
