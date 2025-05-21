import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PagamentoDao } from './pagamento.dao';
import { promises as fs } from 'fs';
import { CupomInfo } from './interfaces/cupom.domain';
import { ICarrinhoDetalhado, InsertCarrinhoParams, ICarrinhoItem } from './interfaces/carrinho.interface';
import Cupom from './domain/Cupom';

@Injectable()
export class PagamentoService {
  constructor(
    private readonly pagamentoDao: PagamentoDao,
    private readonly jwtService: JwtService,
  ) {}

  private calcularTotal(cursos: ICarrinhoDetalhado[]): number {
    return cursos.reduce((acc, item) => {
      return acc + (item.valor || 0) * (item.quantidade || 0);
    }, 0);
  }

  async getCursosPorId(carrinho: ICarrinhoItem[]): Promise<ICarrinhoDetalhado[]> {
    try {
      const idsCursos = carrinho.map(item => item.curso);
      if (idsCursos.length === 0) {
        return [];
      }
      const cursosDoBanco = await this.pagamentoDao.getCursosId(idsCursos);
      return cursosDoBanco;
    } catch (error) {
      console.error("Erro em PagamentoService.getCursosPorId:", error);
      throw new BadRequestException('Erro ao buscar cursos.');
    }
  }

  async validarCupom(nomeCupomInput: string, idUsuario: string, cursosComQuantidade: ICarrinhoDetalhado[]): Promise<CupomInfo> {
    const totalOriginal = this.calcularTotal(cursosComQuantidade);

    const respostaPadrao: CupomInfo = {
      mensagem: "",
      valorTotal: totalOriginal,
      nomeCupomAplicado: "",
      descontoAplicado: 0,
    };

    if (!nomeCupomInput || nomeCupomInput.trim().length === 0) {
      return respostaPadrao;
    }

    const nomeCupom = nomeCupomInput.trim();

    try {
      const cupomDataArray = await this.pagamentoDao.getCupom(nomeCupom, idUsuario);

      if (!cupomDataArray || cupomDataArray.length === 0) {
        return {
          ...respostaPadrao,
          mensagem: "Cupom não encontrado ou não aplicável.",
        };
      }

      const cupomInstance = new Cupom(cupomDataArray[0]);
      const dataAtual = new Date();
      const validacao = cupomInstance.estaValido(dataAtual, idUsuario);

      if (!validacao.valido) {
        return {
          ...respostaPadrao,
          mensagem: validacao.mensagem || "Cupom não é válido",
        };
      }

      const { valorFinal, descontoAplicado } = cupomInstance.calcularValorFinal(totalOriginal);

      return {
        mensagem: "Cupom válido",
        valorTotal: valorFinal,
        nomeCupomAplicado: cupomInstance.getNome(),
        descontoAplicado: descontoAplicado,
      };
    } catch (error) {
      console.error(`Erro ao validar o cupom "${nomeCupom}":`, error);
      throw new BadRequestException('Ocorreu um erro ao tentar validar o cupom. Tente novamente.');
    }
  }

  async inserirCarrinho(params: InsertCarrinhoParams): Promise<number> {
    try {
      return await this.pagamentoDao.insertCarrinho(params);
    } catch (error) {
      console.error("Erro em PagamentoService.inserirCarrinho:", error);
      throw new BadRequestException('Erro ao registrar o carrinho.');
    }
  }

  async processarUploadComprovante(idUsuario: string, file: Express.Multer.File, idCarrinhoToken: string): Promise<void> {
    const { originalname, mimetype, filename, path, size } = file;

    let idCarrinho: number;
    try {
      const decodedToken = this.jwtService.decode(idCarrinhoToken) as { id: number };
      if (!decodedToken || typeof decodedToken.id !== 'number') {
        if (path) {
          await fs.unlink(path).catch(e => console.error(`Falha ao excluir arquivo temporário (token inválido): ${e.message}`));
        }
        throw new BadRequestException('Token de carrinho inválido ou corrompido.');
      }
      idCarrinho = decodedToken.id;
    } catch (error) {
      console.error("Erro ao decodificar token de carrinho:", error);
      if (path && error instanceof BadRequestException) {
        await fs.unlink(path).catch(e => console.error(`Falha ao excluir arquivo temporário (erro token): ${e.message}`));
      }
      if (!(error instanceof BadRequestException)) {
        throw new BadRequestException('Token de carrinho inválido.');
      }
      throw error;
    }

    try {
      await this.pagamentoDao.inserirArquivo(idUsuario, filename, originalname, mimetype, path, size, 1, idCarrinho);
      console.log(`Arquivo ${filename} inserido no banco de dados.`);
      await fs.unlink(path).catch(e => console.error(`Falha ao excluir arquivo temporário: ${e.message}`));
    } catch (error) {
      console.error(`Erro em PagamentoService.processarUploadComprovante (DB): ${error.message}`);
      await fs.unlink(path).catch(e => console.error(`Falha ao excluir arquivo temporário após erro no DB: ${e.message}`));
      throw new BadRequestException('Erro ao salvar informações do comprovante.');
    }
  }

  async processarCarrinho(
    nomeCupom: string | undefined,
    idUsuario: string,
    documentoUsuario: string,
    carrinhoInput: ICarrinhoItem[],
  ): Promise<{ idCarrinho: number; cupomMensagem: CupomInfo; idCarrinhoToken: string }> {
    if (!carrinhoInput || carrinhoInput.length === 0) {
      throw new BadRequestException("Seu carrinho não possui nenhum curso.");
    }

    const isCpf = documentoUsuario?.length === 11;
    if (isCpf) {
      const temCursoComQuantidadeMaiorQueUm = carrinhoInput.some(item => item.quantidade >= 2);
      if (temCursoComQuantidadeMaiorQueUm) {
        throw new BadRequestException("Não é possível comprar mais de uma unidade do mesmo curso para o mesmo usuário (CPF).");
      }
    }

    const cursosBaseDoBanco = await this.getCursosPorId(carrinhoInput);

    if (cursosBaseDoBanco.length !== carrinhoInput.length && carrinhoInput.length > 0) {
      const idsInput = new Set(carrinhoInput.map(c => c.curso));
      const idsBanco = new Set(cursosBaseDoBanco.map(c => c.id));
      const idsFaltantes = [...idsInput].filter(id => !idsBanco.has(id));
      if (idsFaltantes.length > 0) {
        throw new BadRequestException(`Os seguintes cursos não foram encontrados: ${idsFaltantes.join(', ')}.`);
      }
      console.warn("Discrepância entre cursos do input e cursos do banco não causada por IDs faltantes.");
    }

    const cursosComDetalhesEQuantidades: ICarrinhoDetalhado[] = cursosBaseDoBanco.map(cursoDb => {
      const itemDoInput = carrinhoInput.find(item => item.curso === cursoDb.id);
      return {
        ...cursoDb,
        quantidade: itemDoInput ? itemDoInput.quantidade : 0,
      };
    }).filter(curso => curso.quantidade > 0);

    if (cursosComDetalhesEQuantidades.length === 0 && carrinhoInput.length > 0) {
      throw new BadRequestException("Nenhum curso válido com quantidade maior que zero no carrinho.");
    }

    const cursoInativoEncontrado = cursosComDetalhesEQuantidades.find(c => !c.ativo || c.fechado);
    if (cursoInativoEncontrado) {
      throw new BadRequestException(`O curso "${cursoInativoEncontrado.nome}" está inativo ou fechado e não pode ser adicionado ao carrinho.`);
    }

    const cupomInfo = await this.validarCupom(nomeCupom || "", idUsuario, cursosComDetalhesEQuantidades);

    const totalOriginalParaCarrinho = this.calcularTotal(cursosComDetalhesEQuantidades);
    const paramsInsert: InsertCarrinhoParams = {
      idUsuario,
      totalOriginal: totalOriginalParaCarrinho,
      methodoPagamento: 'pix',
      cursos: cursosComDetalhesEQuantidades,
      isCpf,
      valorFinalComDesconto: cupomInfo.valorTotal,
      nomeCupomAplicado: cupomInfo.nomeCupomAplicado,
      valorDescontoCupom: cupomInfo.descontoAplicado,
    };

    const idCarrinho = await this.inserirCarrinho(paramsInsert);
    const idCarrinhoToken = this.jwtService.sign({ id: idCarrinho });

    return { idCarrinho, cupomMensagem: cupomInfo, idCarrinhoToken };
  }
}
