// src/auth/client/auth-client.module.ts
import { Module } from '@nestjs/common';
import { ClientJwtModule } from './jwt/client-jwt.module';

@Module({
  imports: [ClientJwtModule], 
})
export class AuthClientModule {}