export interface NotaFiscalApiResponse {
    id: number;
    datainc: string; // Ou Date se for parseada
    ambiente: string;
    cpfcnpj: string;
    razaosocial: string;
    inscricaoestadual: string | null;
    inscricaomunicipal: string | null;
    orgaopublico: string;
    email: string | null;
    ddd: string | null;
    fone: string | null;
    enderecorua: string;
    endereconum: string;
    enderecocompl: string | null;
    enderecobairro: string;
    enderecocidade: string;
    enderecouf: string;
    enderecocep: string;
    servicovalor: number;
    servicodescricao: string;
    status: string | null; // Pode ser 'sucesso', 'erro', etc. dependendo da API
    nfgerada: string | null; // Provavelmente um ID ou número da NF
    obs: string | null;
  }