// src/pagamento/controllers/pagamento.controller.ts
import {
    Controller,
    Post,
    Req,
    Res,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    HttpStatus,
    Body, // Adicionado para tipar o corpo da requisição explicitamente
    BadRequestException, // Adicionado para tratar erros de forma consistente
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { AuthGuard } from '@nestjs/passport';
  import { PagamentoService } from './pagamento.service';
  import { Request, Response } from 'express';
  
  interface AuthenticatedRequest extends Request {
    user: {
      id: string;
      documento: string; // CPF ou CNPJ do usuário logado
    };
  }
  
  // DTO para o corpo da requisição do carrinho
  class CarrinhoPayloadDto {
    nomeCupom?: string; // Cupom é opcional
    carrinho: { curso: number; quantidade: number }[];
  }
  
  @Controller('dashboard/pagamento')
  export class PagamentoController {
    constructor(private readonly pagamentoService: PagamentoService) {}
  
    @Post('carrinho')
    @UseGuards(AuthGuard('jwt-client'))
    async carrinhoCursos(
      @Req() req: AuthenticatedRequest,
      @Res() res: Response,
      @Body() payload: CarrinhoPayloadDto, // Usar o DTO para validação e tipagem
    ) {
      try {
        const usuario = req.user;
        const { nomeCupom, carrinho } = payload;
  
        // A lógica de validação do carrinho (vazio, quantidade por CPF)
        // foi movida para o PagamentoService.processarCarrinho
  
        const resultadoCarrinho = await this.pagamentoService.processarCarrinho(
          nomeCupom,
          usuario.id,
          usuario.documento, // Passar o documento do usuário para o serviço
          carrinho,
        );
  
        // A mensagem PIX pode ser mais dinâmica ou vir de uma configuração, se necessário
        const pixMessage = `<div>Realize o PIX para o CNPJ: <strong>08.297.075/0001-98</strong> e envie o comprovante.</div>`;
  
        return res.status(HttpStatus.OK).json({
          sucesso: true,
          mensagens: resultadoCarrinho.cupomMensagem.mensagem ? [resultadoCarrinho.cupomMensagem.mensagem] : [], // Adiciona mensagem do cupom se houver
          dados: {
            metodoPagamento: "pix",
            idCarrinhoToken: resultadoCarrinho.idCarrinhoToken,
            mensagemPix: pixMessage, // Renomeado para clareza
            cupom: { // Estrutura do cupom mais detalhada
              aplicado: !!resultadoCarrinho.cupomMensagem.nomeCupomAplicado,
              nome: resultadoCarrinho.cupomMensagem.nomeCupomAplicado,
              valorTotalComDesconto: resultadoCarrinho.cupomMensagem.valorTotal,
              descontoConcedido: resultadoCarrinho.cupomMensagem.descontoAplicado,
              mensagemValidacao: resultadoCarrinho.cupomMensagem.mensagem,
            }
          },
        });
      } catch (error) {
        console.error("Erro ao finalizar a compra:", error);
        if (error instanceof BadRequestException) {
          return res.status(HttpStatus.BAD_REQUEST).json({ sucesso: false, mensagens: [error.message], dados: null });
        }
        // Para outros tipos de erro, uma mensagem genérica
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ sucesso: false, mensagens: ["Erro interno ao processar o carrinho."], dados: null });
      }
    }
  
    @Post('comprovante')
    @UseGuards(AuthGuard('jwt-client'))
    @UseInterceptors(FileInterceptor('file'))
    async uploadComprovante(
      @Req() req: AuthenticatedRequest,
      @Res() res: Response,
      @UploadedFile() file: Express.Multer.File,
    ) {
      try {
        const usuario = req.user;
        // O token do carrinho agora é esperado no corpo da requisição,
        // pois o FileInterceptor pode não lidar bem com multipart/form-data e outros campos de texto de forma consistente
        // dependendo da configuração do cliente. É mais robusto esperar no body.
        const { idCarrinhoToken } = req.body;
  
        if (!file) {
          // Esta validação pode ser feita pelo `ParseFilePipe` do NestJS para ser mais declarativa
          throw new BadRequestException("Comprovante não enviado.");
        }
        if (!idCarrinhoToken) {
          throw new BadRequestException("Token do carrinho não fornecido.");
        }
  
        await this.pagamentoService.processarUploadComprovante(
          usuario.id,
          file,
          idCarrinhoToken,
        );
  
        const linkCursos = usuario.documento.length >= 14 ? 'https://www.cursoslefisc.com.br/novocurso/dashboard/vincular/curso' : 'https://www.cursoslefisc.com.br/novocurso/dashboard/meuscursos';
  
        const htmlLinkCursos = `<p>Seu comprovante foi enviado e está em análise.</p>
                                <a style="padding: 15px 25px;
                                  color: #fff;
                                  background: rgb(225, 118, 42); /* Cor sólida */
                                  border-radius: 5px;
                                  display: inline-block; /* Melhor para links com padding */
                                  text-decoration: none; /* Remover sublinhado padrão */
                                  margin-top: 10px;"
                                  href="${linkCursos}" target="_blank">Acessar Cursos</a>`;
  
        // A resposta agora envia um array de mensagens, que pode incluir o HTML.
        // O frontend precisará saber como renderizar mensagens que contêm HTML.
        return res.status(HttpStatus.OK).json({ sucesso: true, mensagens: ["Comprovante em análise.", htmlLinkCursos], dados: null });
      } catch (error) {
        console.error('Erro ao enviar comprovante:', error);
        if (error instanceof BadRequestException) {
          return res.status(HttpStatus.BAD_REQUEST).json({ sucesso: false, mensagens: [error.message], dados: null });
        }
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ sucesso: false, mensagens: ["Erro ao enviar comprovante."], dados: null });
      }
    }
  }
  