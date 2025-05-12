// src/comprovante/comprovante.service.ts
import { Injectable, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FindComprovantesPaginadosDto } from './dto/find-comprovantes-paginados';
import * as sql from 'mssql';

@Injectable()
export class ComprovanteService {

    constructor(
        @Inject('MSSQL_CONNECTION') private readonly pool: sql.ConnectionPool,
    ) { }


    async getComprovantesPaginados(queryDto: FindComprovantesPaginadosDto) {

        const { pageNumber = 0, pageSize = 10, documento, valor } = queryDto;

        if (!this.pool) {
            console.error("Erro Crítico: Pool de conexão MSSQL não injetado no ComprovanteService.");
            throw new InternalServerErrorException('Erro na configuração do serviço de comprovantes.');
        }

        try {
            const request = this.pool.request();

            let queryBase = `
                FROM Cursos.Comprovante cc
                JOIN Cursos.Usuario cu ON cc.id_usuario = cu.id
                JOIN Pagamento.CarrinhosV2 pcv ON pcv.Id = cc.id_carrinho
                WHERE 1=1 `;

            if (documento) {
                queryBase += ` AND cu.documento LIKE @Documento`;
                request.input('Documento', sql.VarChar, `%${documento}%`);
            }

            if (valor !== undefined && valor !== null) {
                queryBase += ` AND pcv.valor_desconto = @Valor`;
                request.input('Valor', sql.Decimal, valor);
            }


            const resultado = await request
                .input('Offset', sql.Int, pageNumber)
                .input('PageSize', sql.Int, pageSize)
                .query(`
                    SELECT
                        cu.id as idUsuario, cu.documento, cu.email, cc.id, cc.created_at,
                        cc.nome_original, cc.path, cc.nome_arquivo, cc.mimetype,
                        cc.id_carrinho, pcv.valor_desconto, pcv.data_confirmacao, pcv.status
                    ${queryBase}
                    ORDER BY cc.created_at DESC
                    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
                `);


            const requestTotal = this.pool.request();

            if (documento) {
                requestTotal.input('Documento', sql.VarChar, `%${documento}%`);
            }
            if (valor !== undefined && valor !== null) {
                requestTotal.input('Valor', sql.Decimal, valor);
            }

            const resultadoTotal = await requestTotal.query(`SELECT COUNT(cc.id) AS total ${queryBase}`);

            const [recordsetTotal] = resultadoTotal.recordset;

            return { "total": recordsetTotal.total, "comprovantes": resultado.recordset };

        } catch (error) {
            console.error('Erro no serviço getComprovantesPaginados:', error);

            if (error.message && (error.message.includes('Failed to connect') || error.code === 'ECONNREFUSED')) {
                throw new InternalServerErrorException('Não foi possível conectar ao banco de dados para buscar comprovantes.');
            }
            throw new InternalServerErrorException('Ocorreu um erro ao buscar comprovantes paginados.');
        }
    }
    async changeStatus(idPagamento: Number) {
        if (!this.pool) {
            console.error("Erro Crítico: Pool de conexão MSSQL não injetado no ComprovanteService (changeStatus).");
            throw new InternalServerErrorException('Erro na configuração do serviço de comprovantes.');
        }
    
        try {
          const request = this.pool.request();    
       
          request.input('ComprovanteId', sql.Int, idPagamento);     
       
    
          const resultado = await request.execute("ACL.ChangeComprovanteStatus")
            
    
          
          if (resultado.rowsAffected && resultado.rowsAffected[0] === 0) {
              
          }    
    
          return resultado;
        } catch (error) {
          console.error(`Erro ao mudar status do comprovante ${idPagamento}:`, error);
    
           if (error.message && (error.message.includes('Failed to connect') || error.code === 'ECONNREFUSED')) {
                throw new InternalServerErrorException('Não foi possível conectar ao banco de dados para alterar o status do comprovante.');
            }    
         
          throw new InternalServerErrorException('Ocorreu um erro ao mudar o status do comprovante.');
        }
      }
}
