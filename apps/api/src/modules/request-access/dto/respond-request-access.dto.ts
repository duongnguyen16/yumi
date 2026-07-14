import {
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum RespondAction {
  GRANT = 'GRANT',
  REJECT = 'REJECT',
}

export class RespondRequestAccessDTO {
  @IsEnum(RespondAction)
  action!: RespondAction;

  @ValidateIf(
    (dto: RespondRequestAccessDTO) => dto.action === RespondAction.REJECT,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason?: string;
}
