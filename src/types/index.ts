export type StatusBolao = 'aberto' | 'encerrado' | 'sorteado';
export type StatusPagamento = 'Pendente' | 'Pago';

export type RegraDowngrade = 'cortar_satelites' | 'diminuir_dezenas' | 'devolver_excedente';
export type TipoChavePix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

export type ModalidadeLoteria =
  | 'Mega-Sena'
  | 'Mega da Virada'
  | 'Lotofácil'
  | 'Lotofácil da Independência'
  | 'Quina'
  | 'Quina de São João'
  | 'Dupla Sena'
  | 'Dupla de Páscoa';

export interface Bolao {
  id: string;
  nome: string;
  modalidade: ModalidadeLoteria | string;
  concurso_numero: number;
  valor_cota: number;
  data_limite: string;
  chave_pix_organizador: string;
  nome_organizador?: string;
  tipo_chave_pix?: TipoChavePix;
  admin_token?: string;
  regra_downgrade?: RegraDowngrade;
  horario_limite_loterica?: string;
  cidade_loterica?: string;
  status: StatusBolao;
  dezenas_sorteadas?: number[];
  hash_slug: string;
  regras?: string[];
}

export interface Participante {
  id: string;
  bolao_id: string;
  nome: string;
  telefone: string;
  qtd_cotas: number;
  status_pagamento: StatusPagamento;
  data_registro?: string;
  token_acesso?: string;
}

export interface Jogo {
  id: string;
  bolao_id: string;
  dezenas: number[]; // De 6 a 15 números (1-60)
  foto_url?: string;
  criado_em: string;
  codigo_bilhete?: string;
}

export interface DetalheFaixaPremiacao {
  faixaNome: string;
  acertosNecessarios: number;
  qtdPremios: number;
  valorUnitario: number;
  subtotal: number;
}

export interface PremiacaoFaixas {
  // Mega-Sena & Dupla Sena:
  sena?: number;
  quina?: number;
  quadra?: number;
  // Quina / Dupla Sena:
  terno?: number;
  duque?: number;
  // Lotofácil:
  pontos15?: number;
  pontos14?: number;
  pontos13?: number;
  pontos12?: number;
  pontos11?: number;
}

export interface PremiacaoCalculadaUniversal {
  senas: number;
  quinas: number;
  quadras: number;
  ternos?: number;
  duques?: number;
  pontos15?: number;
  pontos14?: number;
  pontos13?: number;
  pontos12?: number;
  pontos11?: number;
  detalhesFaixas?: DetalheFaixaPremiacao[];
  valorTotal: number;
}

export interface JogoConferido {
  jogoId: string;
  dezenas: number[];
  acertos: number[];
  totalAcertos: number;
  premiacaoCalculada: PremiacaoCalculadaUniversal;
  foto_url?: string;
}

export interface RateioCotista extends Participante {
  porcentagem: number;
  valorAReceber: number;
  valorPorCota: number;
}
