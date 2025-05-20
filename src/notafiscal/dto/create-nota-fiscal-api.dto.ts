import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    MinLength,
    MaxLength,
    Matches,
    IsIn,
    IsEmail,
    Min,
    Max,
    registerDecorator,
    ValidationOptions,
    ValidationArguments,

} from 'class-validator';
import { Type } from 'class-transformer';


export function MaxDecimalPlaces(max: number, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'maxDecimalPlaces',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [max],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [maxPlaces] = args.constraints;
                    if (typeof value !== 'number' || isNaN(value)) return false;
                    const decimalPart = value.toString().split('.')[1];
                    return !decimalPart || decimalPart.length <= maxPlaces;
                },
                defaultMessage(args: ValidationArguments) {
                    const [maxPlaces] = args.constraints;
                    return `O campo ${args.property} deve ter no máximo ${maxPlaces} casas decimais.`;
                },
            },
        });
    };
}



export class CreateNotaFiscalApiDto {
    @IsNotEmpty({ message: 'O campo ambiente é obrigatório.' })
    @IsString({ message: 'O campo ambiente deve ser uma string.' })
    @IsIn(['P', 'H'], { message: 'O campo ambiente deve ser "P" (Produção) ou "H" (Homologação).' })
    ambiente: string; // varchar(1) P=Produção H=Homologação

    @IsNotEmpty({ message: 'O campo cpfcnpj é obrigatório.' })
    @IsString({ message: 'O campo cpfcnpj deve ser uma string.' })
    @MinLength(11, { message: 'O campo cpfcnpj deve ter no mínimo 11 caracteres.' })
    @MaxLength(14, { message: 'O campo cpfcnpj deve ter no máximo 14 caracteres.' })
    // Regex para validar CPF (11 dígitos) ou CNPJ (14 dígitos) apenas números
    @Matches(/^\d{11}$|^\d{14}$/, { message: 'O campo cpfcnpj deve ser um CPF ou CNPJ válido (apenas números).' })
    cpfcnpj: string; // varchar(20)

    @IsNotEmpty({ message: 'O campo razaosocial é obrigatório.' })
    @IsString({ message: 'O campo razaosocial deve ser uma string.' })
    @MaxLength(80, { message: 'O campo razaosocial deve ter no máximo 80 caracteres.' })
    razaosocial: string; // varchar(80)

    @IsOptional() // Pode ser 'branco' ou 'isento' ou número
    @IsString({ message: 'O campo inscricaoestadual deve ser uma string.' })
    @MaxLength(20, { message: 'O campo inscricaoestadual deve ter no máximo 20 caracteres.' })
    // Valida se é 'isento', 'branco' ou uma string numérica
    @Matches(/^(isento|branco|\d+)$/i, { message: 'O campo inscricaoestadual deve ser "isento", "branco" ou um número.' })
    inscricaoestadual?: string; // varchar(20)

    @IsOptional()
    @IsString({ message: 'O campo inscricaomunicipal deve ser uma string.' })
    @MaxLength(20, { message: 'O campo inscricaomunicipal deve ter no máximo 20 caracteres.' })
    inscricaomunicipal?: string; // varchar(20)

    @IsNotEmpty({ message: 'O campo orgaopublico é obrigatório.' })
    @IsString({ message: 'O campo orgaopublico deve ser uma string.' })
    @IsIn(['S', 'N'], { message: 'O campo orgaopublico deve ser "S" ou "N".' })
    orgaopublico: string; // varchar(1) S/N

    @IsOptional()
    @IsEmail({}, { message: 'O campo email deve ser um endereço de e-mail válido.' })
    @MaxLength(80, { message: 'O campo email deve ter no máximo 80 caracteres.' })
    email?: string; // varchar(80)

    @IsOptional()
    @IsString({ message: 'O campo ddd deve ser uma string.' })
    @MinLength(2, { message: 'O campo ddd deve ter 2 caracteres.' })
    @MaxLength(2, { message: 'O campo ddd deve ter 2 caracteres.' })
    @Matches(/^\d{2}$/, { message: 'O campo ddd deve conter apenas 2 dígitos numéricos.' })
    ddd?: string; // varchar(2)

    @IsOptional()
    @IsString({ message: 'O campo fone deve ser uma string.' })
    @MinLength(8, { message: 'O campo fone deve ter no mínimo 8 caracteres.' }) // Telefone fixo (8) ou celular (9)
    @MaxLength(10, { message: 'O campo fone deve ter no máximo 10 caracteres.' })
    @Matches(/^\d{8,10}$/, { message: 'O campo fone deve conter apenas dígitos numéricos (8 a 10 dígitos).' })
    fone?: string; // varchar(10)

    @IsNotEmpty({ message: 'O campo enderecorua é obrigatório.' })
    @IsString({ message: 'O campo enderecorua deve ser uma string.' })
    @MaxLength(60, { message: 'O campo enderecorua deve ter no máximo 60 caracteres.' })
    enderecorua: string; // varchar(60)

    @IsNotEmpty({ message: 'O campo endereconum é obrigatório.' })
    @IsString({ message: 'O campo endereconum deve ser uma string.' })
    @MaxLength(10, { message: 'O campo endereconum deve ter no máximo 10 caracteres.' })
    endereconum: string; // varchar(10)

    @IsOptional()
    @IsString({ message: 'O campo enderecocompl deve ser uma string.' })
    @MaxLength(40, { message: 'O campo enderecocompl deve ter no máximo 40 caracteres.' })
    enderecocompl?: string; // varchar(40)

    @IsNotEmpty({ message: 'O campo enderecobairro é obrigatório.' })
    @IsString({ message: 'O campo enderecobairro deve ser uma string.' })
    @MaxLength(40, { message: 'O campo enderecobairro deve ter no máximo 40 caracteres.' })
    enderecobairro: string; // varchar(40)

    @IsNotEmpty({ message: 'O campo enderecocidade é obrigatório.' })
    @IsString({ message: 'O campo enderecocidade deve ser uma string.' })
    @MaxLength(40, { message: 'O campo enderecocidade deve ter no máximo 40 caracteres.' })
    enderecocidade: string; // varchar(40)

    @IsNotEmpty({ message: 'O campo enderecouf é obrigatório.' })
    @IsString({ message: 'O campo enderecouf deve ser uma string.' })
    @MinLength(2, { message: 'O campo enderecouf deve ter 2 caracteres.' })
    @MaxLength(2, { message: 'O campo enderecouf deve ter 2 caracteres.' })
    @Matches(/^[A-Z]{2}$/, { message: 'O campo enderecouf deve ser uma UF válida (ex: SP).' })
    enderecouf: string; // varchar(2)

    @IsNotEmpty({ message: 'O campo enderecocep é obrigatório.' })
    @IsString({ message: 'O campo enderecocep deve ser uma string.' })
    @MinLength(8, { message: 'O campo enderecocep deve ter 8 caracteres.' })
    @MaxLength(8, { message: 'O campo enderecocep deve ter 8 caracteres.' })
    @Matches(/^\d{8}$/, { message: 'O campo enderecocep deve conter apenas 8 dígitos numéricos.' })
    enderecocep: string; // varchar(8)

    @IsNotEmpty({ message: 'O campo servicovalor é obrigatório.' })
    @IsNumber({}, { message: 'O campo servicovalor deve ser um número válido.' })
    @Type(() => Number)
    @MaxDecimalPlaces(2, { message: 'O campo servicovalor deve ter no máximo 2 casas decimais.' })
    @Min(0.01, { message: 'O campo servicovalor deve ser maior que zero.' })
    @Max(100000, { message: 'O campo servicovalor não pode ser maior que 100.000.' })
    servicovalor: number;

    @IsNotEmpty({ message: 'O campo servicodescricao é obrigatório.' })
    @IsString({ message: 'O campo servicodescricao deve ser uma string.' })
    @MaxLength(512, { message: 'O campo servicodescricao deve ter no máximo 512 caracteres.' })
    servicodescricao: string; // varchar(512)
}