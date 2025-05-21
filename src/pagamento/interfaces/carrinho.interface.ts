export interface ICarrinhoItem {
    curso: number;
    quantidade: number;
  }
  
  export interface ICarrinhoDetalhado extends ICarrinhoItem {
    id: number;
    nome: string;
    valor: number;
    ativo: boolean;
    fechado: boolean;
  }
  
export interface InsertCarrinhoParams {
    idUsuario: string;
    totalOriginal: number;
    methodoPagamento: string;
    cursos: ICarrinhoDetalhado[]; 
    isCpf: boolean;
    valorFinalComDesconto: number;
    nomeCupomAplicado?: string;
    valorDescontoCupom?: number;
  }
  export interface ICarrinhoRequest {
    nomeCupom: string;
    carrinho: ICarrinhoItem[];
  }
  
  export interface ICarrinhoResponse {
    sucesso: boolean;
    mensagens: string[];
    dados: {
      metodoPagamento: string;
      idCarrinhoToken: string;
      mensagem: string;
      cupom: {
        mensagem: string;
        valorTotal: number;
      };
    } | null;
  }