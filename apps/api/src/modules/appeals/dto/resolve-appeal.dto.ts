import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { AppealStatus } from 'src/common/schemas/common.enums';

export class ResolveAppealDTO {
  @IsIn([
    AppealStatus.ACCEPTED_TO_DISPUTE,
    AppealStatus.OVERTURNED,
    AppealStatus.UPHELD,
  ])
  decision!:
    | AppealStatus.ACCEPTED_TO_DISPUTE
    | AppealStatus.OVERTURNED
    | AppealStatus.UPHELD;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
