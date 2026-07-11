import { IsEnum } from 'class-validator';

export enum AccessSide {
  OWNER = 'owner',
  REQUESTER = 'requester',
}

export class ListRequestAccessDTO {
  @IsEnum(AccessSide)
  side!: AccessSide;
}
