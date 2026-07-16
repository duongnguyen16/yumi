import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayLoad } from 'src/types/jwt.types';

@Injectable()
export class AppealAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-appeal-access',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('ACCESS_TOKEN_SECRET') as string,
    });
  }

  validate(payload: JwtPayLoad) {
    return { userId: payload.userId };
  }
}
