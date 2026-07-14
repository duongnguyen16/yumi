import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export enum DisputeOutcome {
  KEEP = 'KEEP',
  TRANSFER = 'TRANSFER',
  REVOKE = 'REVOKE',
}

export class ResolveDisputeDTO {
  @IsEnum(DisputeOutcome)
  outcome!: DisputeOutcome;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
