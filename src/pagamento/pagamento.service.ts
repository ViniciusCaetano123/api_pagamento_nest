// src/pagamento/services/pagamento.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PagamentoDao } from './pagamento.dao';
import { promises as fs } from 'fs'; // Para deletar arquivos temporários

const calcularTotal = (cursos: any[]): number => {
    return cursos.reduce((acc, item) => {
        return acc + (item.valor || 0) * (item.quantidade || 0);
    }, 0);
};

@Injectable()
export class PagamentoService {
  constructor(
    private readonly pagamentoDao: PagamentoDao,
    private readonly jwtService: JwtService,
  ) {}
  

  async getCursosPorId(carrinho: { curso: number }[]): Promise<{ cursos: any[]; linhasAfetadas: number }> {
    try {
      const idsCursos = carrinho.map(item => item.curso);
      return await this.pagamentoDao.getCursosId(idsCursos);
    } catch (error) {
      console.error("Erro em PagamentoService.getCursosPorId:", error);
      throw new BadRequestException('Erro ao buscar cursos.');
    }
  }

  async validarCupom(nomeCupom: string, idUsuario: string, cursosComQuantidade: any[]): Promise<{ mensagem: string; valorTotal: number }> {
    const total = calcularTotal(cursosComQuantidade);
    const cupomResposta = { mensagem: "", valorTotal: total };

    if (!nomeCupom || nomeCupom?.length === 0) return cupomResposta;

    try {
      const result = await this.pagamentoDao.getCupom(nomeCupom, idUsuario);
        
      if (!result || result?.length === 0) {
        cupomResposta.mensagem = "Cupom não é válido";
        return cupomResposta;
      }

      const [cupom] = result;
      const dataAtual = new Date();

      if (!cupom.ativo || dataAtual > cupom.vigencia_final) {
        cupomResposta.mensagem = "Cupom não é válido";
        return cupomResposta;
      }

      cupomResposta.mensagem = "Cupom válido";
      const totalBruto   = total - cupom.valor_bruto;
      cupomResposta.valorTotal = totalBruto;
      if(cupom.porcentagem_desconto != 0){
          const totalPorDes = totalBruto * (cupom.porcentagem_desconto / 100); // Ajuste para porcentagem
          cupomResposta.valorTotal =  totalPorDes;
      }
      cupomResposta.valorTotal = Math.max(0, cupomResposta.valorTotal); // Garante que o total não seja negativo

      return cupomResposta;
    } catch (error) {
      console.error("Erro em PagamentoService.validarCupom:", error);
      throw new BadRequestException('Erro ao validar cupom.');
    }
  }

  async inserirCarrinho(cursosComQuantidade: any[], idUsuario: string, metodoPagamento: string, isCpf: boolean, valorComDesconto: number): Promise<number> {
    try {
      const total = calcularTotal(cursosComQuantidade);
      return await this.pagamentoDao.insertCarrinho(idUsuario, total, metodoPagamento, cursosComQuantidade, isCpf, valorComDesconto);
    } catch (error) {
      console.error("Erro em PagamentoService.inserirCarrinho:", error);
      throw new BadRequestException('Erro ao inserir no carrinho.');
    }
  }

  async processarUploadComprovante(idUsuario: string, file: Express.Multer.File, idCarrinhoToken: string): Promise<void> {
    const { originalname, mimetype, filename, path, size } = file;

    let idCarrinho: number;
    try {
      const decodedToken = this.jwtService.decode(idCarrinhoToken) as { id: number };
      if (!decodedToken || typeof decodedToken.id !== 'number') {
        throw new BadRequestException('Token de carrinho inválido ou corrompido.');
      }
      idCarrinho = decodedToken.id;
    } catch (error) {
      console.error("Erro ao decodificar token de carrinho:", error);
      throw new BadRequestException('Token de carrinho inválido.');
    }

    try {
      // Inserir informações do arquivo no banco de dados
      await this.pagamentoDao.inserirArquivo(idUsuario, filename, originalname, mimetype, path, size, 1, idCarrinho);
      console.log(`Arquivo ${filename} inserido no banco de dados.`);

      // **IMPORTANTE**: Remover o arquivo temporário após o processamento.
      // Em produção, você moveria este arquivo para um armazenamento persistente (S3, GCS) aqui.
      await fs.unlink(path).catch(e => console.error(`Falha ao excluir arquivo temporário: ${e.message}`));

    } catch (error) {
      console.error(`Erro em PagamentoService.processarUploadComprovante (DB): ${error.message}`);
      // Em caso de falha na inserção no DB, o arquivo temporário ainda precisa ser removido.
      await fs.unlink(path).catch(e => console.error(`Falha ao excluir arquivo temporário após erro no DB: ${e.message}`));
      throw new BadRequestException('Erro ao salvar informações do comprovante.');
    }
  }

  async processarCarrinho(nomeCupom: string, idUsuario: string, carrinho: any[], isCpf: boolean): Promise<{ idCarrinho: number; cupomMensagem: { mensagem: string; valorTotal: number }; idCarrinhoToken: string }> {
    const { cursos } = await this.getCursosPorId(carrinho);

    const cursosWithQuantidade = cursos.map(item => {
      const correspondente = carrinho.find(curso => curso.curso === item.id);
      return {
        ...item,
        quantidade: correspondente ? correspondente.quantidade : 0,
      };
    });

    const temCursoInativo = cursos.findIndex(e=> !e.ativo || e.fechado );
    const qntCursoIsZero = cursosWithQuantidade.findIndex(e => e.quantidade ==0);

    if (qntCursoIsZero != -1) {
      throw new BadRequestException("Seu carrinho não possui nenhum cursos");
    }

    if (temCursoInativo != -1) {
      const cursoInativo = cursos[temCursoInativo];
      throw new BadRequestException(`Possui cursos inativos no carrinho: ${cursoInativo.nome}`);
    }

    const cupomMensagem = await this.validarCupom(nomeCupom.trim(), idUsuario, cursosWithQuantidade);
    const idCarrinho = await this.inserirCarrinho(cursosWithQuantidade, idUsuario, 'pix', isCpf, cupomMensagem.valorTotal);
    const idCarrinhoToken = this.jwtService.sign({ id: idCarrinho });

    return { idCarrinho, cupomMensagem, idCarrinhoToken };
  }
}