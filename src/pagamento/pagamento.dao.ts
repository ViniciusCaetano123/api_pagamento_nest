// src/pagamento/providers/pagamento.dao.ts
import { Injectable, Inject } from '@nestjs/common';
import * as sql from 'mssql'; // [cite: 6, 69]

const { Table } = sql; // [cite: 6, 69]

@Injectable()
export class PagamentoDao {
  constructor( @Inject('MSSQL_CONNECTION') private readonly pool: sql.ConnectionPool) {} // [cite: 7, 70]

  async insertCarrinho(idUsuario: string, total: number, methodoPagamento: string, cursos: any[], isCpf: boolean, valorComDesconto: number): Promise<number> {
    const transaction = this.pool.transaction(); // [cite: 7, 70]
    try {
      await transaction.begin(); // [cite: 8, 71]

      const strSqlCarrinho = `
        INSERT INTO Pagamento.CarrinhosV2 (usuario_id, valor, metodo_pagamento,valor_desconto)
        OUTPUT INSERTED.id
        VALUES (@usuario_id, @valor, @metodo_pagamento,@valor_desconto)
      `; 

      const request = transaction.request(); // [cite: 10, 73]

      request.input('usuario_id', idUsuario); // [cite: 10, 73]
      request.input('valor', total); // [cite: 10, 73]
      request.input('metodo_pagamento', methodoPagamento); // [cite: 10, 73]
      request.input('valor_desconto', valorComDesconto); // [cite: 10, 73]

      const result = await request.query(strSqlCarrinho); // [cite: 10, 73]
      const [outputId] = result.recordset; // [cite: 11, 74]
      const idCarrinho = outputId.id; // [cite: 11, 74]

      const table = new Table('Pagamento.[Carrinhos.Cursos]'); // [cite: 11, 74]
      table.columns.add('id_curso', sql.Int, { nullable: false }); // [cite: 11, 74]
      table.columns.add('id_carrinho', sql.Int, { nullable: false }); // [cite: 12, 75]
      table.columns.add('id_usuario', sql.UniqueIdentifier, { nullable: true }); // [cite: 12, 75]
        console.log(cursos)
      for (let i = 0; i < cursos.length; i++) { // [cite: 12, 75]
        for (let j = 0; j < cursos[i].quantidade; j++) { // [cite: 12, 75]
          if (isCpf) { 
            table.rows.add(cursos[i].id, idCarrinho, idUsuario); 
          } else { 
            table.rows.add(cursos[i].id, idCarrinho); 
          }
        }
      }

      await request.bulk(table); // [cite: 15, 78]
      await transaction.commit(); // [cite: 16, 79]
      return idCarrinho; // [cite: 17, 80]
    } catch (err) {
      await transaction.rollback(); // [cite: 17, 80]
      console.error("Erro no PagamentoDao.insertCarrinho:", err.message);
      throw new Error('Erro ao inserir no carrinho'); // [cite: 18, 81]
    }
  }

  async getCupom(nome: string, idUsuario: string): Promise<any[]> {
    try {
      const request = this.pool.request(); // [cite: 18, 81]
      const resultado = await request.input('nome', sql.VarChar, nome) // [cite: 19, 82]
        .input('id_usuario', sql.UniqueIdentifier, idUsuario) // [cite: 19, 82]
        .query("SELECT * FROM Pagamento.Cupom WHERE nome like @nome AND id_usuario = @id_usuario"); // [cite: 19, 82]
      return resultado.recordset; // [cite: 20, 83]
    } catch (error) {
      console.error("Erro no PagamentoDao.getCupom:", error.message);
      throw new Error('Erro ao pegar os cursos'); // [cite: 20, 83]
    }
  }

  async inserirArquivo(idUsuario: string, nomeArquivo: string, nomeOriginal: string, mimetype: string, path: string, size: number, ativo: number = 1, idCarrinho: number): Promise<{ success: boolean; rowsAffected: number[] }> {
    try {
      const request = this.pool.request(); // [cite: 20, 83]
      const resultado = await request
        .input('id_usuario', sql.UniqueIdentifier, idUsuario) // [cite: 21, 84]
        .input('nome_arquivo', sql.VarChar, nomeArquivo) // [cite: 21, 84]
        .input('nome_original', sql.VarChar, nomeOriginal) // [cite: 21, 84]
        .input('mimetype', sql.VarChar, mimetype) // [cite: 21, 84]
        .input('path', sql.VarChar, path) // [cite: 21, 84]
        .input('size', sql.BigInt, size) // [cite: 22, 85]
        .input('ativo', sql.Bit, ativo) // [cite: 22, 85]
        .input('id_carrinho', sql.Int, idCarrinho) // [cite: 22, 85]
        .query(`INSERT INTO Cursos.Comprovante(id_usuario, nome_arquivo, nome_original, mimetype, path, size, ativo, id_carrinho)
                VALUES (@id_usuario, @nome_arquivo, @nome_original, @mimetype, @path, @size, @ativo, @id_carrinho);`); // [cite: 23, 86]

      return { success: true, rowsAffected: resultado.rowsAffected }; // [cite: 23, 86]
    } catch (error) {
      console.error("Erro no PagamentoDao.inserirArquivo:", error.message);
      throw new Error('Erro ao inserir arquivo: ' + error.message); // [cite: 24, 87]
    }
  }

  async getCursosId(ids: number[]): Promise<{ cursos: any[]; linhasAfetadas: number }> {
    try {
      const params = ids.map((_, index) => `@id${index}`).join(', '); // [cite: 25, 88]
      const strSql = `SELECT id,ativo,nome,fechado,valor FROM [Cursos].Curso WHERE id IN (${params})`; // [cite: 26, 89]
      const request = this.pool.request(); // [cite: 26, 89]
      ids.forEach((id, index) => { // [cite: 27, 90]
        request.input(`id${index}`, id); // [cite: 27, 90]
      });
      const result = await request.query(strSql); // [cite: 28, 91]

      const { recordset, rowsAffected } = result; // [cite: 28, 91]
      const [linhas] = rowsAffected; // [cite: 29, 92]
      return {
        cursos: recordset,
        linhasAfetadas: linhas
      }; 
    } catch (e) {
      console.error("Erro no PagamentoDao.getCursosId:", e.message);
      throw new Error('Erro ao pegar os cursos'); // [cite: 30, 93]
    }
  }
}