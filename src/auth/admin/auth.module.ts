import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthModule } from './jwt/jwt.module';
import { JwtStrategy } from './jwt/jwt.strategy';
@Module({  
imports: [
    JwtAuthModule
  ],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy], 
})
export class AuthModule {}