// src/auth/jwt/jwt.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: process.env.Token_Site,
        signOptions: {
          expiresIn: '10h', 
        },
      }),
    
    }),
  ], 
  exports: [JwtModule],
})
export class JwtAuthModule {}
