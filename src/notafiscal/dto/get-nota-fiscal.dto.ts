import { IsNotEmpty, IsString, IsInt, Min, Max, Length,Matches } from 'class-validator';
import { Type } from 'class-transformer'; // Para transformação de tipos

export class GetNotaFiscalDto {
  @IsNotEmpty({ message: 'O ID do comprovante é obrigatório.' })
  @IsInt({ message: 'O ID do comprovante deve ser um número inteiro.' })
  @Min(1, { message: 'O ID do comprovante deve ser um número positivo.' })
  @Type(() => Number) // Garante que o valor será transformado para número
  idComprovante: number;

  @IsNotEmpty({ message: 'O documento (CPF/CNPJ) é obrigatório.' })
  @IsString({ message: 'O documento deve ser uma string.' })
  @Length(11, 14, { message: 'O documento deve ter 11 (CPF) ou 14 (CNPJ) caracteres.' })
  // Validação mais rigorosa para garantir que é um CPF ou CNPJ numérico
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'O documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.' })
  documento: string;
}