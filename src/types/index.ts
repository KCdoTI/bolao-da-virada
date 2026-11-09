export type StatusBolao = 'aberto' | 'encerrado' | 'sorteado';
export type StatusPagamento = 'Pendente' | 'Pago';

export interface Bolao {
  id: string;
  nome: string;
  modalidade: string;
  concurso_numero: number;
  valor_cota: number;
  data_limite: string;
  chave_pix_organizador: string;
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
}

export interface Jogo {
  id: string;
  bolao_id: string;
  dezenas: number[]; // De 6 a 15 números (1-60)
  foto_url?: string;
  criado_em: string;
  codigo_bilhete?: string;
}

export interface PremiacaoFaixas {
  sena: number;
  quina: number;
  quadra: number;
}

export interface JogoConferido {
  jogoId: string;
  dezenas: number[];
  acertos: number[];
  totalAcertos: number;
  premiacaoCalculada: {
    senas: number;
    quinas: number;
    quadras: number;
    valorTotal: number;
  };
  foto_url?: string;
}

export interface RateioCotista extends Participante {
  porcentagem: number;
  valorAReceber: number;
  valorPorCota: number;
}
