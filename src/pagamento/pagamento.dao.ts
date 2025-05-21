// src/pagamento/providers/pagamento.dao.ts
import { Injectable, Inject } from '@nestjs/common';
import * as sql from 'mssql';
import { ICupom } from './interfaces/cupom.domain';
import { ICarrinhoDetalhado,InsertCarrinhoParams } from './interfaces/carrinho.interface';
const { Table } = sql;

@Injectable()
export class PagamentoDao {
    constructor(@Inject('MSSQL_CONNECTION') private readonly pool: sql.ConnectionPool) { }

    async insertCarrinho(params: InsertCarrinhoParams): Promise<number>  {
        const {
            idUsuario,
            totalOriginal,
            methodoPagamento,
            cursos, 
            isCpf,
            valorFinalComDesconto,
            nomeCupomAplicado,
            valorDescontoCupom,
          } = params;
        const transaction = this.pool.transaction();
        try {

            await transaction.begin();

            const strSqlCarrinho = `
        INSERT INTO Pagamento.CarrinhosV2 (
            usuario_id, 
            valor,              -- Valor original total dos itens
            metodo_pagamento,
            valor_desconto,     -- Valor final após descontos (este era o seu valorComDesconto)
            nome_cupom_aplicado,
            valor_desconto_cupom 
        )
        OUTPUT INSERTED.id
        VALUES (
            @usuario_id, 
            @valor_original, 
            @metodo_pagamento,
            @valor_final_com_desconto,
            @nome_cupom_aplicado,
            @valor_desconto_cupom
        )`;
            const request = transaction.request();

            request.input('usuario_id', sql.UniqueIdentifier, idUsuario);
            request.input('valor_original', sql.Decimal(10, 2), totalOriginal);
            request.input('metodo_pagamento', sql.VarChar, methodoPagamento);
            request.input('valor_final_com_desconto', sql.Decimal(10, 2), valorFinalComDesconto);

            if (nomeCupomAplicado) {
                request.input('nome_cupom_aplicado', sql.VarChar(100), nomeCupomAplicado);
            } else {
                request.input('nome_cupom_aplicado', sql.VarChar(100), null);
            }

            if (valorDescontoCupom !== undefined && valorDescontoCupom !== null) {
                request.input('valor_desconto_cupom', sql.Decimal(10, 2), valorDescontoCupom);
            } else {
                request.input('valor_desconto_cupom', sql.Decimal(10, 2), null);
            }

            const result = await request.query(strSqlCarrinho);
            const [outputId] = result.recordset;
            const idCarrinho = outputId.id;

            const tableCursos = new Table('Pagamento.[Carrinhos.Cursos]');
            tableCursos.columns.add('id_curso', sql.Int, { nullable: false });
            tableCursos.columns.add('id_carrinho', sql.Int, { nullable: false });
            tableCursos.columns.add('id_usuario', sql.UniqueIdentifier, { nullable: true });

            for (let i = 0; i < cursos.length; i++) {
                const cursoItem = cursos[i];
                if (cursoItem && typeof cursoItem.quantidade === 'number' && typeof cursoItem.id === 'number') {
                    for (let j = 0; j < cursoItem.quantidade; j++) {
                        if (isCpf) {
                            tableCursos.rows.add(cursoItem.id, idCarrinho, idUsuario);
                        } else {
                            tableCursos.rows.add(cursoItem.id, idCarrinho, null);
                        }
                    }
                } else {
                    console.warn('Item de curso inválido ou sem quantidade/id:', cursoItem);
                }
            }

            if (tableCursos.rows.length > 0) {
                await request.bulk(tableCursos);
            } else {
                console.warn(`Nenhum curso para adicionar via bulk para o carrinho ${idCarrinho}. Verifique os dados dos cursos e quantidades.`);
            }

            await transaction.commit();
            return idCarrinho;
        } catch (err) {
            await transaction.rollback();
            console.error("Erro no PagamentoDao.insertCarrinho:", err.message, err.stack);

            throw new Error('Erro ao inserir no carrinho no DAO: ' + err.message);
        }
    }

    async getCupom(nome: string, idUsuario: string): Promise<ICupom[]> {
        try {
            const request = this.pool.request();

            const resultado = await request.input('nome', sql.VarChar, nome)
                .input('id_usuario', sql.UniqueIdentifier, idUsuario)
                .query(`
            SELECT TOP 1 * FROM Pagamento.Cupom 
            WHERE nome = @nome 
              AND (id_usuario = @id_usuario OR id_usuario IS NULL) -- Permite cupons globais (sem id_usuario) ou específicos
              -- AND ativo = 1 -- Você pode querer filtrar cupons ativos diretamente aqui
              -- AND vigencia_final >= GETDATE() -- E cupons dentro da validade
            ORDER BY id_usuario DESC; -- Prioriza cupons específicos do usuário sobre os globais
        `);

            return resultado.recordset;
        } catch (error) {
            console.error("Erro no PagamentoDao.getCupom:", error.message);
            throw new Error('Erro ao buscar cupom no DAO.');
        }
    }

    async inserirArquivo(idUsuario: string, nomeArquivo: string, nomeOriginal: string, mimetype: string, path: string, size: number, ativo: number = 1, idCarrinho: number): Promise<{ success: boolean; rowsAffected: number[] }> {
        try {
            const request = this.pool.request();
            const resultado = await request
                .input('id_usuario', sql.UniqueIdentifier, idUsuario)
                .input('nome_arquivo', sql.VarChar, nomeArquivo)
                .input('nome_original', sql.VarChar, nomeOriginal)
                .input('mimetype', sql.VarChar, mimetype)
                .input('path', sql.VarChar, path) 
                .input('size', sql.BigInt, size)
                .input('ativo', sql.Bit, ativo)
                .input('id_carrinho', sql.Int, idCarrinho)
                .query(`
            INSERT INTO Cursos.Comprovante 
                (id_usuario, nome_arquivo, nome_original, mimetype, path, size, ativo, id_carrinho)
            VALUES 
                (@id_usuario, @nome_arquivo, @nome_original, @mimetype, @path, @size, @ativo, @id_carrinho);
        `);

            return { success: true, rowsAffected: resultado.rowsAffected };
        } catch (error) {
            console.error("Erro no PagamentoDao.inserirArquivo:", error.message);
            throw new Error('Erro ao inserir arquivo no DAO: ' + error.message);
        }
    }

    async getCursosId(ids: number[]): Promise< ICarrinhoDetalhado[]> {
        if (!ids || ids.length === 0) {
            return [];
        }
        try {
            const params = ids.map((_, index) => `@id${index}`).join(', ');
            const strSql = `SELECT id, ativo, nome, fechado, valor FROM [Cursos].Curso WHERE id IN (${params})`;
            const request = this.pool.request();
            ids.forEach((id, index) => {
                request.input(`id${index}`, sql.Int, id);
            });
            const result = await request.query(strSql);
            const cursos = result.recordset
            return cursos;
        } catch (e) {
            console.error("Erro no PagamentoDao.getCursosId:", e.message);
            throw new Error('Erro ao buscar cursos por ID no DAO.');
        }
    }
}
