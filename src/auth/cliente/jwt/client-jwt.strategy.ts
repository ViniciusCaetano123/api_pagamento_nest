// src/auth/client/jwt/client-jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClientJwtStrategy extends PassportStrategy(Strategy, 'jwt-client') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>('Token_Site') || '',
            ignoreExpiration: false,
        });
    }

    async validate(payload: any) {
        console.log('Payload:', payload);
        return { id: payload.Id, email: payload.Email, documento: payload.Documento };
    }
}