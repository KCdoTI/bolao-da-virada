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
  data_sorteio?: string;
  resultado?: ResultadoConcurso;
  resultados_extras?: ResultadoConcurso[];
  fechado_em?: string;
  permitir_inscricao_publica?: boolean;
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
  pago_em?: string;
  is_organizador?: boolean;
  aceite_em?: string;
  regras_aceitas_hash?: string;
  avisou_pagamento_em?: string;
}

export interface OpcaoConcursoCaixa {
  numero: number;
  dataSorteioIso: string;
  dataSorteioBr: string;
  prazoSugeridoIso: string;
  valorEstimado?: number;
  tipo: 'proximo_oficial' | 'calendario_previsto' | 'especial_oficial';
  modalidadeSugerida?: string;
  rotulo: string;
}

export interface LotteryLiveInfo {
  modalidade: string;
  modalidadeBase: string;
  consultadoEm: string;
  fonteTipo: 'caixa_oficial' | 'contingencia_espelho';
  fonteUrl: string;
  ultimoConcurso: {
    numero: number;
    dataApuracao: string;
    dezenas: number[];
    dezenasSegundoSorteio?: number[];
    acumulado: boolean;
    localSorteio?: string;
  };
  proximoConcurso: {
    numero: number;
    dataProximoConcurso: string;
    dataSorteioIso: string;
    prazoSugeridoIso: string;
    valorEstimado: number;
  };
  acumuladoEspecial?: {
    valorAcumulado: number;
    numeroConcursoEspecial?: number;
  };
  opcoesConcursos: OpcaoConcursoCaixa[];
}

export interface ResultadoConcurso {
  modalidade: string;
  concurso: number;
  origem: 'caixa_oficial' | 'manual';
  fonte?: string;
  consultado_em: string;
  dataApuracao: string;
  sorteios: { dezenas: number[]; premiacao: PremiacaoFaixas }[];
}

export interface PalpiteParticipante {
  id: string;
  participante_id: string;
  participante_nome: string;
  dezenas: number[];
  criado_em: string;
}

export interface NotificacaoEvento {
  seq: number;
  tipo:
    | 'nova_inscricao'
    | 'regras_aceitas'
    | 'pagamento_informado'
    | 'novo_palpite'
    | 'resultado_publicado';
  criado_em: string;
  titulo: string;
  mensagem_whatsapp: string;
  participante_id?: string;
  participante_nome?: string;
  lido?: boolean;
}

export interface PoolState {
  bolao: Bolao;
  participantes: Participante[];
  jogos: Jogo[];
  palpites?: PalpiteParticipante[];
  eventos?: NotificacaoEvento[];
}

export type TipoJogoBolao = 'normal' | 'troco';

export interface Jogo {
  id: string;
  bolao_id: string;
  dezenas: number[];
  foto_url?: string;
  foto_sha256?: string;
  criado_em: string;
  codigo_bilhete?: string;
  tipo_jogo?: TipoJogoBolao;
  observacao?: string;
  modalidade_especifica?: string;
  concurso_especifico?: number;
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
  valorCotas?: number;
  valorTroco?: number;
}
