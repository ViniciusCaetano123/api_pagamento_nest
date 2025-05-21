import { ICupom } from "../interfaces/cupom.domain";
export default class Cupom {
    private data: ICupom;
  
    constructor(data: ICupom) {
      this.data = data;
    }
  
    public estaValido(dataReferencia: Date, idUsuarioAplicacao?: string): { valido: boolean; mensagem?: string } {
      if (!this.data.ativo) {
        return { valido: false, mensagem: "Cupom inativo." };
      }
      if (dataReferencia < new Date(this.data.vigencia_inicial) || dataReferencia > new Date(this.data.vigencia_final)) {
        return { valido: false, mensagem: "Cupom fora do período de vigência." };
      }
      if (this.data.id_usuario && this.data.id_usuario !== idUsuarioAplicacao) {
        return { valido: false, mensagem: "Cupom não aplicável a este usuário." };
      }
      // ... outras validações (limite de uso, etc.)
      return { valido: true };
    }
  
    public calcularValorFinal(totalOriginal: number): { valorFinal: number; descontoAplicado: number } {
      let valorComDesconto = totalOriginal;
      let descontoConcedido = 0;
  
      // Lógica de aplicação de desconto (exemplo)
      if (this.data.valor_bruto > 0) {
        const descontoBrutoReal = Math.min(valorComDesconto, this.data.valor_bruto); // Não descontar mais que o valor
        valorComDesconto -= descontoBrutoReal;
        descontoConcedido += descontoBrutoReal;
      }
  
      if (this.data.porcentagem_desconto > 0 && valorComDesconto > 0) { // Só aplica % se ainda há valor
        const descontoPercentualReal = valorComDesconto * this.data.porcentagem_desconto;
        valorComDesconto -= descontoPercentualReal;
        descontoConcedido += descontoPercentualReal;
      }
      
      valorComDesconto = Math.max(0, valorComDesconto); // Não pode ser negativo
      // O desconto aplicado é a diferença, mas como calculamos incrementalmente, podemos só ajustar
      descontoConcedido = totalOriginal - valorComDesconto;
  
  
      return { valorFinal: valorComDesconto, descontoAplicado: descontoConcedido };
    }
  
    public getNome(): string {
      return this.data.nome;
    }
  }