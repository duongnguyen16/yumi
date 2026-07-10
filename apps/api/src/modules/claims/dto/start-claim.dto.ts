import { IsMongoId } from 'class-validator';

export class StartClaimDto {
  @IsMongoId({ message: 'locationId không hợp lệ' })
  locationId!: string;
}
