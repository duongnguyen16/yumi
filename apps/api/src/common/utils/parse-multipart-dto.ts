import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

type DtoClass<T extends object> = new () => T;

export function parseMultipartDto<T extends object>(
  value: string | undefined,
  dto: DtoClass<T>,
) {
  if (!value) {
    throw new BadRequestException('Thiếu dữ liệu yêu cầu');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BadRequestException('Dữ liệu yêu cầu không hợp lệ');
  }

  const instance = plainToInstance(dto, parsed);
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0) {
    throw new BadRequestException('Dữ liệu yêu cầu không hợp lệ');
  }

  return instance;
}
