// src/notafiscal/notafiscal.service.ts

import {
    Injectable,
    Inject,
    InternalServerErrorException,
    NotFoundException,
    BadRequestException,
    ConflictException, 
  } from '@nestjs/common';
  import * as sql from 'mssql';
  import axios, { AxiosInstance } from 'axios'
  import { HttpService } from '@nestjs/axios';
  
  import { plainToClass } from 'class-transformer';
  import { validateOrReject } from 'class-validator';
  import { NotaFiscalApiResponse } from './interfaces/nota-fiscal-api-response.interface';
  import { CreateNotaFiscalApiDto } from './dto/create-nota-fiscal-api.dto';
  import { firstValueFrom } from 'rxjs';
  @Injectable()
  export class NotaFiscalService {
    private readonly axiosInstance : AxiosInstance;
  
    constructor(
        private readonly httpService: HttpService, 
        @Inject('MSSQL_CONNECTION') private readonly pool: sql.ConnectionPool,
    ) {
        this.axiosInstance = this.httpService.axiosRef;
    }
  
    async gerarJsonNotaFiscal(idComprovante: number, documento: string) {
      if (!this.pool) {
        throw new InternalServerErrorException('Erro Crítico: Pool de conexão MSSQL não injetado no NotaFiscalService.');
      }
  
      try {
        const documentoLimpo = documento.replace(/\D/g, '');
  
        const request = this.pool.request();
        const isCnpj = documentoLimpo.length === 14;
  
      
        const selectColumns = `
          cc.id AS idComprovantes,
          ee.razao_social, ce.ddd, ce.fone, ee.inscricao_estadual, ee.inscricao_municipal,
          cu.documento, ce.orgaopublico, ce.rua, ce.num, ce.bairro, ce.cidade, ce.uf, ce.cep,
          pc.valor_desconto, pc.status, ce.compl, cu.email,
          cc.enviado_nf  
        `;
        const selectColumnsAluno = `
          cc.id AS idComprovantes,
          ca.nome, ce.ddd, ce.fone, cu.documento, ce.orgaopublico, ce.rua, ce.num, ce.bairro,
          ce.cidade, ce.uf, ce.cep, pc.valor_desconto, pc.status, ce.compl, cu.email,
          cc.enviado_nf  
        `;
  
        const strQuery = isCnpj
          ? `SELECT ${selectColumns}
              FROM Cursos.Usuario cu
              JOIN Empresa.Empresa ee ON cu.id = ee.id_usuario
              JOIN Cursos.Endereco ce ON cu.id = ce.id_usuario
              JOIN Cursos.Comprovante cc ON cc.id_usuario = cu.id
              JOIN Pagamento.CarrinhosV2 pc ON cc.id_carrinho = pc.Id
              WHERE cc.id = @idComprovante`
          : `SELECT ${selectColumnsAluno}
              FROM Cursos.Usuario cu
              JOIN Cursos.Aluno ca ON cu.id = ca.id_usuario
              JOIN Cursos.Endereco ce ON cu.id = ce.id_usuario
              JOIN Cursos.Comprovante cc ON cc.id_usuario = cu.id
              JOIN Pagamento.CarrinhosV2 pc ON cc.id_carrinho = pc.Id
              WHERE cc.id = @idComprovante`;
        
              
  
        request.input('idComprovante', sql.Int, idComprovante);
        const result = await request.query(strQuery);
  
        if (!result.recordset || result.recordset.length === 0) {
          throw new NotFoundException('Nenhum registro encontrado para o comprovante informado.');
        }
  
        const dadosRaw = result.recordset[0];
  
       
        if (dadosRaw.enviado_nf === true) { 
          throw new ConflictException(`O comprovante ${idComprovante} já teve a nota fiscal emitida.`);
        }
        const strQueryDescricaoServico = `SELECT  cco.nome FROM Cursos.Curso cco
              JOIN Pagamento.[Carrinhos.Cursos]  pcc ON  pcc.id_curso = cco.id            
              JOIN Pagamento.CarrinhosV2 pcv ON pcv.Id = pcc.id_carrinho
              where pcv.Id = @idCarrinho`;
        request.input('idCarrinho', sql.Int, idComprovante);

        const resultDescricaoServico = await request.query(strQueryDescricaoServico);
        const descricaoServico = resultDescricaoServico.recordset.map(item => 'Ref ' + item.nome).join(', ');
        
        const cepFormatado = dadosRaw.cep ? dadosRaw.cep.toString().padStart(8, '0') : '';
        const ambiente = 'H';
  
        const dadosParaValidacao = {
          ambiente: ambiente,
          cpfcnpj: dadosRaw.documento,
          razaosocial: isCnpj ? dadosRaw.razao_social : dadosRaw.nome,
          inscricaoestadual: isCnpj ? (dadosRaw?.inscricao_estadual || 'isento') : 'isento',
          inscricaomunicipal: isCnpj ? (dadosRaw?.inscricao_municipal || '') : '',
          orgaopublico: dadosRaw.orgaopublico || 'N',
          email: dadosRaw.email || '',
          ddd: dadosRaw?.ddd || '',
          fone: dadosRaw?.fone || '',
          enderecorua: dadosRaw.rua || '',
          endereconum: dadosRaw.num || '',
          enderecocompl: dadosRaw?.compl || '',
          enderecobairro: dadosRaw.bairro || '',
          enderecocidade: dadosRaw.cidade || '',
          enderecouf: dadosRaw.uf || '',
          enderecocep: cepFormatado,
          servicovalor: dadosRaw.valor_desconto !== undefined && dadosRaw.valor_desconto !== null ? dadosRaw.valor_desconto : 1,
          servicodescricao: descricaoServico,
        };
  
        const notaFiscalApiDto = plainToClass(CreateNotaFiscalApiDto, dadosParaValidacao);
  
        await validateOrReject(notaFiscalApiDto, {
          validationError: { target: false, value: false },
        });
  
        return notaFiscalApiDto;
      } catch (error) {
        console.error('Erro ao gerar e validar JSON para ISS:', error);
        if (Array.isArray(error) && error.every(e => e.constraints)) {
          const validationErrors = error.flatMap(e => Object.values(e.constraints));
          throw new BadRequestException(`Dados da nota fiscal inválidos: ${validationErrors.join('; ')}`);
        }
        if (error instanceof NotFoundException || error instanceof ConflictException) {
          throw error;
        }
        throw new InternalServerErrorException('Ocorreu um erro ao gerar os dados da nota fiscal.');
      }
    }
    
    async getAllNotasFiscaisFromExternalApi() {
        try {
       
        const response = await firstValueFrom( this.httpService.get<NotaFiscalApiResponse[]>('')); 
        const notasFiscais = response.data;
       
        notasFiscais.sort((a, b) => b.id - a.id);
  
        return notasFiscais;
        } catch (error) {
        console.error('Erro ao listar notas fiscais da API externa:', error);
        if (axios.isAxiosError(error)) {
            throw new InternalServerErrorException(
            `Erro ao se comunicar com a API externa para listar NFs: ${error.message}. Detalhes: ${JSON.stringify(error.response?.data || error.message)}`,
            );
        }
        throw new InternalServerErrorException('Ocorreu um erro inesperado ao listar as notas fiscais.');
        }
    }

    async getNotaFiscalFromExternalApi(externalId: number) {
        try {
         
          const response = await firstValueFrom( this.httpService.get<NotaFiscalApiResponse>(`/${externalId}`));         
            response
          if (!response.data) {
            throw new NotFoundException(`Nota fiscal com ID ${externalId} não encontrada na API externa.`);
          }
    
          return response.data;
        } catch (error) {
          console.error(`Erro ao buscar nota fiscal ${externalId} da API externa:`, error);
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
              throw new NotFoundException(`Nota fiscal com ID ${externalId} não encontrada na API externa.`);
            }
            throw new InternalServerErrorException(
              `Erro ao se comunicar com a API externa de NF: ${error.message}. Detalhes: ${JSON.stringify(error.response?.data || error.message)}`,
            );
          }
          throw new InternalServerErrorException(`Ocorreu um erro inesperado ao buscar a nota fiscal ${externalId}.`);
        }
    }

    async enviarNotaFiscal(idComprovante: number, documento: string): Promise<any> {
      let contentNotaFiscal: CreateNotaFiscalApiDto;
      try {
        
        contentNotaFiscal = await this.gerarJsonNotaFiscal(idComprovante, documento);     
        
        const response = await firstValueFrom( this.httpService.post('', contentNotaFiscal));
      
        await this.marcarComprovanteComoEnviado(idComprovante);
  
        return response.data;
      } catch (error) {
        console.error('Erro no fluxo de envio de nota fiscal:', error);
        if (axios.isAxiosError(error)) {
          throw new InternalServerErrorException(
            `Erro ao se comunicar com a API externa de NF: ${error.message}. Detalhes: ${JSON.stringify(error.response?.data || error.message)}`,
          );
        }
       
        if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
          throw error;
        }
        throw new InternalServerErrorException('Ocorreu um erro inesperado ao enviar a nota fiscal.');
      }
    }  
   
    private async marcarComprovanteComoEnviado(idComprovante: number): Promise<void> {
      try {
        const request = this.pool.request();
        await request
          .input('idComprovante', sql.Int, idComprovante)
          .query(`UPDATE Cursos.Comprovante SET enviado_nf = 1 WHERE id = @idComprovante`);       
      } catch (dbError) {
        console.error(`Erro ao marcar comprovante ${idComprovante} como enviado:`, dbError);
        
        throw new InternalServerErrorException(`Nota fiscal enviada, mas houve um erro ao atualizar o status do comprovante no banco de dados.`);
      }
    }
  }