
import { Controller, Get, Query, UsePipes, ValidationPipe, HttpStatus, UseGuards, Put, Param } from '@nestjs/common';
import { ComprovanteService } from './comprovante.service';
import { FindComprovantesPaginadosDto } from './dto/find-comprovantes-paginados'; 
import { AuthGuard } from '@nestjs/passport';

@Controller('comprovante')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true  }))
export class ComprovanteController {
  constructor(private readonly comprovanteService: ComprovanteService) {}

  
  @Get()
  @UseGuards(AuthGuard('jwt')) // Protege esta rota com o JWT Guard
  async findPaginated(@Query() queryParams: FindComprovantesPaginadosDto) {  
    const resultadoPaginado = await this.comprovanteService.getComprovantesPaginados(queryParams);     
     return {      
       message: 'Comprovantes paginados buscados com sucesso!',
       data: resultadoPaginado 
     };
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt')) 
  async changeStatus(@Param('id') id: string) {  
    const idPagamento = Number(id);
     const resultadoUpdate = await this.comprovanteService.changeStatus(idPagamento);  
     console.log(resultadoUpdate)   
     return {      
        message: 'Status do comprovante alterado com sucesso!',
     };
  }
  


  
}
