import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayLoad } from '../../types/jwt.types';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-rt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
      secretOrKey: configService.get<string>('REFRESH_TOKEN_SECRET') as string,
    });
  }

  validate(payload: JwtPayLoad) {
    return {
      userId: payload.userId,
    };
  }
}
