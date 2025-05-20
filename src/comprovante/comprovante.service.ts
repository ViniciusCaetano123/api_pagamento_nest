import { Injectable, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FindComprovantesPaginadosDto } from './dto/find-comprovantes-paginados';
import * as sql from 'mssql';


interface ProcedureResultRecord {
    ComprovanteId: number;
    OldStatus: string;
    NewStatus: string;
    RowsAffected: number;
}
export interface EstatisticaMensalComprovante {
    mes: Date;
    status: string;
    quantidade: number;
    valor_total: number | null;
}

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
    async changeStatusComprovante(idPagamento: number, idAdmin: string) {
        if (!this.pool) {
            console.error("Erro Crítico: Pool de conexão MSSQL não injetado no ComprovanteService (changeStatus).");
            throw new InternalServerErrorException('Erro na configuração do serviço de comprovantes.');
        }

        const transaction = new sql.Transaction(this.pool);

        try {
            await transaction.begin();

            const requestChangeSp = new sql.Request(transaction);
            requestChangeSp.input('ComprovanteId', sql.Int, idPagamento);

            const resultadoSp = await requestChangeSp.execute<ProcedureResultRecord>("ACL.ChangeComprovanteStatus");

            if (!resultadoSp.recordset || resultadoSp.recordset.length === 0) {
                await transaction.rollback();
                throw new NotFoundException(`Nenhum resultado retornado pela procedure para o comprovante ${idPagamento}.`);
            }

            const spData = resultadoSp.recordset[0];

            if (spData.RowsAffected === 0) {
                await transaction.rollback();
                throw new NotFoundException(`Nenhuma alteração de status realizada para o comprovante ${idPagamento} conforme retornado pela procedure. Status anterior: ${spData.OldStatus}.`);
            }

            if (spData.ComprovanteId !== idPagamento) {
                await transaction.rollback();
                console.error(`ID do comprovante retornado pela SP (${spData.ComprovanteId}) não corresponde ao ID de entrada (${idPagamento}).`);
                throw new InternalServerErrorException('Inconsistência de dados ao processar a alteração de status.');
            }

            const statusAnterior = spData.OldStatus;
            const statusNovo = spData.NewStatus;

            const requestLog = new sql.Request(transaction);
            requestLog.input('log_id_carrinho', sql.Int, idPagamento);
            requestLog.input('log_id_admin', sql.UniqueIdentifier, idAdmin);
            requestLog.input('log_status_anterior', sql.NVarChar(50), statusAnterior);
            requestLog.input('log_status_novo', sql.NVarChar(50), statusNovo);

            await requestLog.query(
                'INSERT INTO ACL.ComprovanteStatusLog (id_carrinho, id_admin, status_anterior, status_novo) VALUES (@log_id_carrinho, @log_id_admin, @log_status_anterior, @log_status_novo)'
            );

            await transaction.commit();

            return {
                message: "Status alterado e logado com sucesso.",
                details: spData
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async getEstatisticasMensaisComprovantes() {
        if (!this.pool) {
            throw new InternalServerErrorException('Erro na configuração do serviço de estatísticas de comprovantes.');
        }
        const querySQL = `
            SELECT
                DATEFROMPARTS(YEAR(cc.created_at), MONTH(cc.created_at), 1) AS mes,
                pcv.status,
                COUNT(*) AS quantidade,
                SUM(pcv.valor_desconto) AS valor_total
            FROM Cursos.Comprovante cc
            JOIN Cursos.Usuario cu ON cc.id_usuario = cu.id
            JOIN Pagamento.CarrinhosV2 pcv ON pcv.Id = cc.id_carrinho
            WHERE pcv.status IN ('confirmado', 'cancelado', 'pendente')
            GROUP BY
                DATEFROMPARTS(YEAR(cc.created_at), MONTH(cc.created_at), 1),
                pcv.status
            ORDER BY mes, pcv.status;`;
        try {
            const request = this.pool.request();
            const resultado = await request.query(querySQL);
            return resultado.recordset as EstatisticaMensalComprovante[];
        } catch (error) {
            throw error;
        }
    }

}
