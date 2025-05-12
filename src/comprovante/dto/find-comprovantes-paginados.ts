// src/comprovante/dto/find-comprovantes-paginados.dto.ts
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger'; // Opcional, para documentação Swagger

export class FindComprovantesPaginadosDto {
  @ApiProperty({ description: 'Número da página (baseado em 0)', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number) // Garante que o valor seja convertido para número
  pageNumber?: number = 0;

  @ApiProperty({ description: 'Quantidade de itens por página', required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number) // Garante que o valor seja convertido para número
  pageSize?: number = 10;

  @ApiProperty({ description: 'Filtrar por documento do usuário', required: false })
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiProperty({ description: 'Filtrar por valor do comprovante', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number) // Garante que o valor seja convertido para número
  valor?: number;
}