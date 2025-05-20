import { Controller, Post, Body, UseGuards, Res, HttpStatus,Get,BadRequestException,Param} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; 
import { NotaFiscalService } from './notafiscal.service';
import { GetNotaFiscalDto } from './dto/get-nota-fiscal.dto';
import { Response } from 'express';

@Controller('notafiscal')
export class NotaFiscalController {
  constructor(private readonly notaFiscalService: NotaFiscalService) {}

  @Post()
  @UseGuards(AuthGuard('jwt')) 
  async gerarEEnviarNotaFiscal(@Body() body: GetNotaFiscalDto, @Res() res: Response) {
    try {
      const { idComprovante, documento } = body;
      const responseFromExternalApi = await this.notaFiscalService.enviarNotaFiscal(idComprovante, documento);
      return res.status(HttpStatus.OK).json({
        message: 'Nota fiscal processada e enviada com sucesso.',
        data: responseFromExternalApi,
      });
    } catch (error) {
            console.error('Erro no Controller de Nota Fiscal:', error);
      throw error; 
    }
  }

   
  
  @Get('external') 
  @UseGuards(AuthGuard('jwt'))
  async getAllExternalNotasFiscais(@Res() res: Response) {
    try {
      const notasFiscais = await this.notaFiscalService.getAllNotasFiscaisFromExternalApi();
      return res.status(HttpStatus.OK).json(notasFiscais);
    } catch (error) {
      console.error('Erro no Controller de Nota Fiscal (GET all):', error);
      throw error;
    }
  }
}