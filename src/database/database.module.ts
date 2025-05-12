import { Module, Global } from '@nestjs/common';
import * as sql from 'mssql'; // Use esta sintaxe

@Global() // Torna o módulo disponível globalmente
@Module({
  providers: [
    {
      provide: 'MSSQL_CONNECTION', // Token de injeção
      useFactory: async () => {
        console.log(process.env.SQLServer);
        try {
          const pool = new sql.ConnectionPool(process.env.SQLServer || "");
          await pool.connect();
          console.log('Conectado ao SQL Server com sucesso!');
          return pool;
        } catch (err) {
          console.error('Erro ao conectar ao SQL Server:', err);
          throw err;
        }
      },
      
    },
  ],
  exports: ['MSSQL_CONNECTION'], // Exporta o pool de conexão
})
export class DatabaseModule {}