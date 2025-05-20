// src/pagamento/pagamento.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import * as multer from 'multer'; // <--- Importe o pacote multer aqui!

import { PagamentoController } from './pagamento.controller'; // Ajuste o caminho se necessário
import { PagamentoService } from './pagamento.service';     // Ajuste o caminho se necessário
import { PagamentoDao } from './pagamento.dao';          // Ajuste o caminho se necessário

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({ secret: process.env.Token_Site || 'fallback-secret-for-jwt' }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        dest: configService.get<string>('UPLOAD_TEMP_DIR') || './temp_uploads',
        limits: {
          fileSize: configService.get<number>('MAX_UPLOAD_SIZE') || 5 * 1024 * 1024, // 5MB
        },
        storage: multer.diskStorage({ // <--- Use 'multer.diskStorage' aqui
          destination: function (req, file, cb) {
            const uploadDir = configService.get<string>('UPLOAD_TEMP_DIR') || './temp_uploads';
            // Certifique-se de que o diretório exista. Em um ambiente real, você pode criar
            // este diretório na inicialização do serviço ou usar um sistema de arquivos mais robusto.
            cb(null, uploadDir);
          },
          filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const originalExtension = file.originalname.split('.').pop();
            cb(null, `${file.fieldname}-${uniqueSuffix}.${originalExtension}`);
          },
        }),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PagamentoController],
  providers: [
    PagamentoService,
    PagamentoDao,
  ],
  exports: [PagamentoService],
})
export class PagamentoModule {}