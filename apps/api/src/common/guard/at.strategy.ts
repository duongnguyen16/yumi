import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayLoad } from 'src/types/jwt.types';

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt-at') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('ACCESS_TOKEN_SECRET') as string,
    });
  }
  validate(payload: JwtPayLoad) {
    // khi mà payload có scope là appeal thì không cho phép truy cập vào các route khác ngoài /appeals
    if (payload.scope === 'appeal') {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.userId,
    };
  }
}
