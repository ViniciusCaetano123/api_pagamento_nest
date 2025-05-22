import { Module } from '@nestjs/common';
import { HttpModule, HttpModuleOptions } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config'; 
import { NotaFiscalController } from './notafiscal.controller';
import { NotaFiscalService } from './notafiscal.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule], 
      useFactory: async (configService: ConfigService): Promise<HttpModuleOptions> => ({
      
        baseURL: 'http://200.150.204.114:8010/nfservico', 
        auth: {
          username: 'lefisc10', 
          password: 'Lef@9000#1000!', 
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      inject: [ConfigService], 
    }),
    ConfigModule, 
  ],
  providers: [NotaFiscalService],
  controllers: [NotaFiscalController],
})
export class NotaFiscalModule {}