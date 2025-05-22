
import { Controller, Get, Query, UsePipes, ValidationPipe, UseGuards, Put, Param, Request, Post } from '@nestjs/common';
import { ComprovanteService } from './comprovante.service';
import { FindComprovantesPaginadosDto } from './dto/find-comprovantes-paginados';
import { AuthGuard } from '@nestjs/passport';

@Controller('comprovantes')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ComprovanteController {
  constructor(private readonly comprovanteService: ComprovanteService) { }


  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getPaginated(@Query() queryParams: FindComprovantesPaginadosDto) {
    const resultadoPaginado = await this.comprovanteService.getComprovantesPaginados(queryParams);
    return {
      dados: resultadoPaginado
    };
  }

  @Post(':id')
  @UseGuards(AuthGuard('jwt'))
  async changeStatus(@Param('id') id: string, @Request() req) {
    const idPagamento = Number(id);
    const usuario = req.user;
    const resultadoUpdate = await this.comprovanteService.changeStatusComprovante(idPagamento, usuario.userId);
    return {
      message: 'Status do comprovante alterado com sucesso!',
    };
  }

  @Get('estatisticas-mensais')
  @UseGuards(AuthGuard('jwt'))
  async getEstatisticasMensais() {
    const estatisticas = await this.comprovanteService.getEstatisticasMensaisComprovantes();
    return { dados: estatisticas };
  }

  @Get('top-dez-atividades-admin')
  @UseGuards(AuthGuard('jwt'))
  async getTopDezAtividadesAdmin() {
    const topAtividades = await this.comprovanteService.getTopDezAtividadesAdmin();
    return { dados: topAtividades };
  }




}
