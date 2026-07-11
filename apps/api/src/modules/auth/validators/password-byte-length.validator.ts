import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsPasswordByteLength(
  maxBytes: number,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isPasswordByteLength',
      target: object.constructor,
      propertyName,
      constraints: [maxBytes],
      options: {
        message: `Mật khẩu không được vượt quá ${maxBytes} byte`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          const [limit] = args.constraints as [number];
          return Buffer.byteLength(value, 'utf8') <= limit;
        },
      },
    });
  };
}
