import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Importe ConfigModule também, se ainda não o fez.

@Module({
  imports: [
    JwtModule.registerAsync({
      // 1. Mesmo que ConfigModule seja global, adicione-o aqui para o contexto da factory.
      imports: [ConfigModule], // <--- Adicione esta linha!
      // 2. Informe ao NestJS para injetar o ConfigService.
      inject: [ConfigService], // <--- Adicione esta linha!
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('Token_Site'),
        signOptions: {
          expiresIn: '10h',
        },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtAuthModule {}