import {
    Controller,
    Post,
    Req,
    Res,    
    UseInterceptors,
    UploadedFile,
    UseGuards,
    HttpStatus,
    
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { AuthGuard } from '@nestjs/passport';
  import { PagamentoService } from './pagamento.service';
  import { Request, Response } from 'express'; 
  

  interface AuthenticatedRequest extends Request {
    user: {
      id: string;
      documento: string;
    };
  }
  
  @Controller('dashboard/pagamento')
  export class PagamentoController {
    constructor(private readonly pagamentoService: PagamentoService) {}
  
    @Post('carrinho')
    @UseGuards(AuthGuard('jwt-client'))
    async carrinhoCursos(@Req() req: AuthenticatedRequest, @Res() res: Response) {
      try {
       
        const usuario = req.user;
  
        const { nomeCupom, carrinho } = req.body;
       
        if (carrinho.length == 0) { 
          return res.status(HttpStatus.OK).json({ sucesso: false, mensagens: ["Nenhum curso no carrinho"], dados: null }); 
        }
  
        const isCpf = usuario.documento.length == 11; 
        if (isCpf) { 
          const temMaiorUm = carrinho.findIndex(e=> e.quantidade >=2); 
          if (temMaiorUm != -1) { 
            return res.status(HttpStatus.OK).json({ sucesso: false, mensagens: ["Não é possivel compra dois curso para o mesmo usuário"], dados: null }); 
          }
        }
  
        const resultadoCarrinho = await this.pagamentoService.processarCarrinho(
          nomeCupom,
          usuario.id,
          carrinho,
          isCpf,
        );
  
        const pixMessage = `<div>Realize o PIX para o CNPJ: <strong>08.297.075/0001-98</strong> e envia o comprovante</strong></div>`; 
  
        return res.status(HttpStatus.OK).json({
          sucesso: true,
          mensagens: [],
          dados: {
            metodoPagamento: "pix",
            idCarrinhoToken: resultadoCarrinho.idCarrinhoToken,
            mensagem: pixMessage,
            cupom: resultadoCarrinho.cupomMensagem,
          },
        });
      } catch (error) {
        console.error("Erro ao finalizar a compra:", error); 
        return res.status(HttpStatus.BAD_REQUEST).json({ sucesso: false, mensagens: ["Erro ao finalizar a compra"], dados: null }); 
      }
    }
  
    @Post('comprovante')
    @UseGuards(AuthGuard('jwt-client')) 
    @UseInterceptors(FileInterceptor('file')) 
    async uploadComprovante(
      @Req() req: AuthenticatedRequest,
      @Res() res: Response,
      @UploadedFile() file: Express.Multer.File, // O arquivo uploaded pelo Multer
    ) {
      try {
        const usuario = req.user;
        const { idCarrinhoToken } = req.body;
  
        if (!file) { 
          return res.status(HttpStatus.BAD_REQUEST).json({ sucesso: false, mensagens: ["Comprovante não enviado"], dados: null });
        }
        if (!idCarrinhoToken) { 
          return res.status(HttpStatus.BAD_REQUEST).json({ sucesso: false, mensagens: ["Carrinho não encontrado"], dados: null }); 
        }
  
        await this.pagamentoService.processarUploadComprovante(
          usuario.id,
          file,
          idCarrinhoToken,
        );
  
        const linkCursos = usuario.documento.length >=14 ? 'https://www.cursoslefisc.com.br/novocurso/dashboard/vincular/curso' : 'https://www.cursoslefisc.com.br/novocurso/dashboard/meuscursos'; 
  
        const htmlLinkCursos = `<a style="padding: 15px 25px;
          color: #fff;
          background: rgb(225, 118, 42, 1);
          border-radius: 5px;
          display: block;" href="${linkCursos}" target="_blank"> Acessar Cursos </a>`; 
  
        return res.status(HttpStatus.OK).json({ sucesso: true, mensagens: ["Comprovante em analise", htmlLinkCursos], dados: null }); 
      } catch (error) {
        console.error('Erro ao enviar comprovante:', error); 
        return res.status(HttpStatus.BAD_REQUEST).json({ sucesso: false, mensagens: ["Erro ao enviar comprovante"], dados: null }); 
      }
    }
  }