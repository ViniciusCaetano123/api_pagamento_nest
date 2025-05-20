// src/notafiscal/notafiscal.module.ts
import { Module } from '@nestjs/common';
import { HttpModule, HttpModuleOptions } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config'; // ConfigService ainda é injetado, mas não usado para estas vars

import { NotaFiscalService } from './notafiscal.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule], // Mantenha ConfigModule se você usar ConfigService em outro lugar no useFactory
      useFactory: async (configService: ConfigService): Promise<HttpModuleOptions> => ({
        // Valores diretamente no código (hardcoding)
        baseURL: 'http://200.150.204.114:8010/nfservico', // URL da API de Nota Fiscal
        auth: {
          username: 'lefisc10', // Nome de usuário
          password: 'Lef@9000#1000!', // Senha
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      inject: [ConfigService], // Mantenha a injeção se o useFactory usar ConfigService para outras configurações
    }),
    ConfigModule, // Mantenha ConfigModule no imports do módulo
  ],
  providers: [NotaFiscalService],
  exports: [NotaFiscalService],
})
export class NotaFiscalModule {}