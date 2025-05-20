import 'reflect-metadata';
import { plainToClass } from 'class-transformer';

import { validate } from 'class-validator';
import { CreateNotaFiscalApiDto } from './create-nota-fiscal-api.dto';

describe('CreateNotaFiscalApiDto', () => {

  const validCpfData: CreateNotaFiscalApiDto = {
    ambiente: 'P',
    cpfcnpj: '12345678900', 
    razaosocial: 'Nome do Contribuinte',
    orgaopublico: 'N',
    enderecorua: 'Rua Principal',
    endereconum: '123',
    enderecobairro: 'Centro',
    enderecocidade: 'Sao Paulo',
    enderecouf: 'SP',
    enderecocep: '01000000',
    servicovalor: 150.75,
    servicodescricao: 'Prestação de Cursos',
    inscricaoestadual: 'isento', // Opcional, mas comum para CPF
  };

  const validCnpjData: CreateNotaFiscalApiDto = {
    ambiente: 'H',
    cpfcnpj: '12345678000190', // CNPJ válido
    razaosocial: 'Empresa Teste Ltda',
    orgaopublico: 'S',
    enderecorua: 'Av. Teste',
    endereconum: '456',
    enderecobairro: 'Industrial',
    enderecocidade: 'Rio de Janeiro',
    enderecouf: 'RJ',
    enderecocep: '20000000',
    servicovalor: 2500.50,
    servicodescricao: 'Serviço de Consultoria',
    inscricaoestadual: '12345678', // Opcional, mas comum para CNPJ
    inscricaomunicipal: '987654', // Opcional
    email: 'contato@empresa.com',
    ddd: '21',
    fone: '998877665',
    enderecocompl: 'Sala 101',
  };
 
  it('deve validar um objeto de dados CPF válido', async () => {
    const dto = plainToClass(CreateNotaFiscalApiDto, validCpfData);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('deve retornar erro se servicovalor não for um número', async () => {
    const data = { ...validCpfData, servicovalor: 'abc' as any };
    const dto = plainToClass(CreateNotaFiscalApiDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isNumber');
    expect(errors[0].constraints?.isNumber).toBe('O campo servicovalor deve ser um número válido.');
  });

  it('deve retornar erro se servicovalor tiver mais de 2 casas decimais usando MaxDecimalPlaces', async () => {
    const data = { ...validCpfData, servicovalor: 100.123 }; // 3 casas decimais
    const dto = plainToClass(CreateNotaFiscalApiDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxDecimalPlaces');
    expect(errors[0].constraints?.maxDecimalPlaces).toBe('O campo servicovalor deve ter no máximo 2 casas decimais.');
  });

  it('deve validar servicovalor com 0 casas decimais', async () => {
    const data = { ...validCpfData, servicovalor: 500 };
    const dto = plainToClass(CreateNotaFiscalApiDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // Deve passar
  });

  it('deve validar servicovalor com 1 casa decimal', async () => {
    const data = { ...validCpfData, servicovalor: 75.5 };
    const dto = plainToClass(CreateNotaFiscalApiDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBe(0); 
  });

  it('deve retornar erro se servicovalor for nulo', async () => {  
    const data = { ...validCpfData, servicovalor: null };
    const dto = plainToClass(CreateNotaFiscalApiDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('servicovalor');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    expect(errors[0].constraints?.isNotEmpty).toBe('O campo servicovalor é obrigatório.');
  });
    
  it('deve retornar erro se servicovalor for indefinido (ausente)', async () => {
      const data: Partial<CreateNotaFiscalApiDto> = { ...validCpfData }; // Cast to Partial
      delete data.servicovalor;
      const dto = plainToClass(CreateNotaFiscalApiDto, data);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);     
      const servicovalorError = errors.find(e => e.property === 'servicovalor');
      expect(servicovalorError).toBeDefined();
      expect(servicovalorError?.constraints).toHaveProperty('isNotEmpty');
      expect(servicovalorError?.constraints?.isNotEmpty).toBe('O campo servicovalor é obrigatório.');
  });
    
  it('deve retornar erro se servicovalor for 0 (zero)', async () => {
    const data = { ...validCpfData, servicovalor: 0 }; // Testando com zero
    const dto = plainToClass(CreateNotaFiscalApiDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // Esperamos que haja erros
    expect(errors[0].property).toBe('servicovalor'); // Garante que o erro é no campo certo
    expect(errors[0].constraints).toHaveProperty('min'); // Esperamos o erro do decorador @Min
    expect(errors[0].constraints?.min).toBe('O campo servicovalor deve ser maior que zero.'); // Mensagem específica
  });

  it('deve retornar erro se servicovalor for negativo', async () => {
    const data = { ...validCpfData, servicovalor: -100.50 };
    const dto = plainToClass(CreateNotaFiscalApiDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); 
    expect(errors[0].property).toBe('servicovalor');
    expect(errors[0].constraints).toHaveProperty('min');
    expect(errors[0].constraints?.min).toBe('O campo servicovalor deve ser maior que zero.');
  });
  
  it('deve validar servicovalor se for igual ao valor máximo permitido (100.000)', async () => {
    const data = { ...validCpfData, servicovalor: 100000 };
    const dto = plainToClass(CreateNotaFiscalApiDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('deve retornar erro se servicovalor for maior que o valor máximo permitido (100.000)', async () => {
    const data = { ...validCpfData, servicovalor: 100000.01 }; 
    const dto = plainToClass(CreateNotaFiscalApiDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('servicovalor');
    expect(errors[0].constraints).toHaveProperty('max');
    expect(errors[0].constraints?.max).toBe('O campo servicovalor não pode ser maior que 100.000.');
  });
});