import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Por favor, forneça um email válido.' })
  @IsNotEmpty({ message: 'O email não pode estar vazio.' })
  email: string;

  @IsString({ message: 'A senha deve ser um texto.'})
  @IsNotEmpty({ message: 'A senha não pode estar vazia.' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.'}) // Ajuste o tamanho mínimo conforme necessário
  password: string;
}
