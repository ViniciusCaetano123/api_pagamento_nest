import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/admin/auth.module';
import { AuthClientModule } from './auth/cliente/auth-client.module';
import { ComprovanteModule } from './comprovante/comprovante.module';
import { NotaFiscalModule } from './notafiscal/notafiscal.module';
import { PagamentoModule } from './pagamento/pagamento.module';
import { ConfigModule } from '@nestjs/config'; 
@Module({
  imports: [ ConfigModule.forRoot({
    isGlobal: true, 
  }),DatabaseModule,AuthModule,ComprovanteModule,NotaFiscalModule,AuthClientModule,PagamentoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
