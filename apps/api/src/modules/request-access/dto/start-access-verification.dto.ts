import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import { RequestAccessVerificationPurpose } from 'src/common/schemas/request-access-verification-session.schema';

export class StartAccessVerificationDTO {
  @IsMongoId()
  locationId!: string;

  @IsIn(['CREATE', 'TAKEOVER'])
  purpose!: RequestAccessVerificationPurpose;

  @IsOptional()
  @IsMongoId()
  requestAccessId?: string;
}
