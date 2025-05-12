import { Module } from '@nestjs/common';
import { ComprovanteService } from './comprovante.service';
import { ComprovanteController } from './comprovante.controller';

@Module({ 
  controllers: [ComprovanteController],
  providers: [ComprovanteService],  
})
export class ComprovanteModule {}