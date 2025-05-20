import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientJwtStrategy } from './client-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({     
      imports: [ConfigModule],     
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('Token_Site')        
      }),
    }),
  ],
  providers: [ClientJwtStrategy],
  exports: [JwtModule, ClientJwtStrategy],
})
export class ClientJwtModule {}