import { Injectable, Inject, UnauthorizedException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as sql from 'mssql';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('MSSQL_CONNECTION') private readonly pool: sql.ConnectionPool,
    private readonly jwtService: JwtService, 
  ) {}
  
  async login(loginDto: LoginDto): Promise<{ user: any; token: string }> { 
    const { email, password } = loginDto;

    if (!this.pool) {
      console.error("Erro Crítico: Pool de conexão MSSQL não injetado no AuthService.");
      throw new InternalServerErrorException('Erro na configuração do serviço de autenticação.');
    }

    try {
      const request = this.pool.request();

      request.input('email', sql.NVarChar(60), email);

      const result = await request.query(`
        SELECT
            id,
            name,
            email,
            password AS hashedPassword,
            is_active,
            tipo_acesso,
            created_at,
            updated_at,
            last_login
        FROM [ACL].[User]
        WHERE email = @email;
      `);


      if (!result.recordset || result.recordset.length === 0) {
        console.warn(`Tentativa de login falhou: Usuário não encontrado para o email: ${email}`);
        throw new NotFoundException(`Usuário com email '${email}' não encontrado.`);
      }

      const user = result.recordset[0];

      if (!user.is_active) {
        console.warn(`Tentativa de login falhou: Conta de usuário inativa para o email: ${email}`);
        throw new UnauthorizedException('Conta de usuário inativa.');
      }

      const isPasswordMatching = await bcrypt.compare(password, user.hashedPassword);

      if (!isPasswordMatching) {
        console.warn(`Tentativa de login falhou: Senha inválida para o email: ${email}`);
        throw new UnauthorizedException('Credenciais inválidas.'); // Mensagem genérica por segurança
      }
    
      const payload = {
          sub: user.id,
          email: user.email,
          tipoAcesso: user.tipo_acesso,           
      };

      const token = this.jwtService.sign(payload);
      
      const { hashedPassword, ...userData } = user;
      return { user: userData, token: token };

    } catch (error) {
      console.error(`Erro durante o login para o email ${email}:`, error);

      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      if (error.message.includes('Failed to connect') || error.code === 'ECONNREFUSED') {
          throw new InternalServerErrorException('Não foi possível conectar ao banco de dados.');
      }

      throw new InternalServerErrorException('Ocorreu um erro durante o login.');
    }
  }
}
