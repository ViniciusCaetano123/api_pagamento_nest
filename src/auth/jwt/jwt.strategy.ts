
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';


export interface JwtPayload {
  sub: string; 
  email: string;
  tipoAcesso: string; 
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({     
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),   
      secretOrKey: process.env.Token_Site || "",
      ignoreExpiration: false, 
    });
  }

  
  async validate(payload: JwtPayload) {  
    return { userId: payload.sub, email: payload.email, tipoAcesso: payload.tipoAcesso };
  }
}
