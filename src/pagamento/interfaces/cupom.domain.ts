export interface ICupom { 
    id: number;
    nome: string;
    valor_bruto: number;
    porcentagem_desconto: number;
    vigencia_inicial: Date;
    vigencia_final: Date;
    id_usuario: string; 
    ativo: boolean;   
}

export interface CupomInfo{
    mensagem: string
    valorTotal: number
    nomeCupomAplicado: string
    descontoAplicado: number
}