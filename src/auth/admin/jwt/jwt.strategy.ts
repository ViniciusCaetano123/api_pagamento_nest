
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; 
  email: string;
  tipoAcesso: string; 
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy,'jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),     
      secretOrKey: configService.get<string>('Token_Site') || '', 
      ignoreExpiration: false,
    });
  }

  
  async validate(payload: JwtPayload) {  
    console.log('Payload:', payload); 
    return { userId: payload.sub, email: payload.email, tipoAcesso: payload.tipoAcesso };
  }
}
