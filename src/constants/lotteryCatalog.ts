/**
 * Catálogo Oficial de Modalidades e Edições Especiais da Caixa Econômica Federal
 * Base para expansão contínua: Mega-Sena, Lotofácil, Quina, Dupla Sena e Edições Especiais.
 */

export interface FaixaPremiacaoInfo {
  nome: string;
  acertos: number;
  descricao: string;
}

export interface ModalidadeDetalhada {
  id: string;
  nome: string;
  modalidadeBase: 'Mega-Sena' | 'Lotofácil' | 'Quina' | 'Dupla Sena';
  isEspecial: boolean;
  edicaoEspecialNome?: string;
  icone: string;
  universoNumeros: number; // Ex: 60 (Mega), 25 (Lotofácil), 80 (Quina), 50 (Dupla Sena)
  minimoDezenas: number;
  maximoDezenas: number;
  qtdDezenasSorteadas: number;
  valorApostaSimples: number; // Preço oficial Caixa 2026
  mesEvento?: string;
  regraAcumulacao: 'Acumula normalmente' | 'Não acumula — rateio obrigatório nas faixas inferiores';
  descricao: string;
  estilo: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    badgeIcon: string;
    destaqueColor: string;
  };
  faixas: FaixaPremiacaoInfo[];
  regrasPadrao: string[];
}

export const CATALOGO_MODALIDADES: Record<string, ModalidadeDetalhada> = {
  'Mega-Sena': {
    id: 'mega-sena',
    nome: 'Mega-Sena',
    modalidadeBase: 'Mega-Sena',
    isEspecial: false,
    icone: '🍀',
    universoNumeros: 60,
    minimoDezenas: 6,
    maximoDezenas: 15,
    qtdDezenasSorteadas: 6,
    valorApostaSimples: 6.0,
    regraAcumulacao: 'Acumula normalmente',
    descricao: 'A maior loteria do Brasil. Sorteios regulares às terças, quintas e sábados.',
    estilo: {
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/30',
      badgeIcon: '🍀',
      destaqueColor: 'emerald',
    },
    faixas: [
      { nome: 'Sena', acertos: 6, descricao: 'Prêmio Principal (6 acertos)' },
      { nome: 'Quina', acertos: 5, descricao: 'Segunda Faixa (5 acertos)' },
      { nome: 'Quadra', acertos: 4, descricao: 'Terceira Faixa (4 acertos)' },
    ],
    regrasPadrao: [
      'Apostas oficiais registradas na Caixa com volante de 6 a 15 dezenas.',
      'Apenas cotas com pagamento confirmado até o fechamento participam do rateio.',
      'Divisão do prêmio proporcional à quantidade de cotas pagas.',
      'Comprovantes digitalizados via OCR e auditáveis na plataforma.',
    ],
  },

  'Mega da Virada': {
    id: 'mega-virada',
    nome: 'Mega da Virada',
    modalidadeBase: 'Mega-Sena',
    isEspecial: true,
    edicaoEspecialNome: 'Mega da Virada — Edição Especial de Fim de Ano',
    icone: '🌟',
    universoNumeros: 60,
    minimoDezenas: 6,
    maximoDezenas: 15,
    qtdDezenasSorteadas: 6,
    valorApostaSimples: 6.0,
    mesEvento: 'Dezembro (31/12)',
    regraAcumulacao: 'Não acumula — rateio obrigatório nas faixas inferiores',
    descricao: 'O maior prêmio do ano da Caixa. Não acumula: se não houver 6 acertos, divide na Quina.',
    estilo: {
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      badgeIcon: '🌟',
      destaqueColor: 'amber',
    },
    faixas: [
      { nome: 'Sena', acertos: 6, descricao: 'Prêmio Principal da Virada (6 acertos)' },
      { nome: 'Quina', acertos: 5, descricao: 'Faixa de Contingência se não houver Sena (5 acertos)' },
      { nome: 'Quadra', acertos: 4, descricao: 'Terceira Faixa (4 acertos)' },
    ],
    regrasPadrao: [
      'Concurso especial de fim de ano (31/12) — O prêmio NÃO ACUMULA.',
      'Se ninguém acertar as 6 dezenas, o montante total é dividido entre os acertadores da Quina.',
      'Rateio estritamente proporcional às cotas pagas até o prazo limite.',
      'Ata com hash SHA-256 e guarda física dos bilhetes pelo organizador.',
    ],
  },

  'Lotofácil': {
    id: 'lotofacil',
    nome: 'Lotofácil',
    modalidadeBase: 'Lotofácil',
    isEspecial: false,
    icone: '🎯',
    universoNumeros: 25,
    minimoDezenas: 15,
    maximoDezenas: 20,
    qtdDezenasSorteadas: 15,
    valorApostaSimples: 3.5,
    regraAcumulacao: 'Acumula normalmente',
    descricao: 'Fácil de apostar e com maiores chances estatísticas de premiação (11 a 15 acertos).',
    estilo: {
      badgeBg: 'bg-fuchsia-500/15',
      badgeText: 'text-fuchsia-300',
      badgeBorder: 'border-fuchsia-500/30',
      badgeIcon: '🎯',
      destaqueColor: 'fuchsia',
    },
    faixas: [
      { nome: '15 Acertos', acertos: 15, descricao: 'Prêmio Principal Máximo' },
      { nome: '14 Acertos', acertos: 14, descricao: 'Segunda Faixa' },
      { nome: '13 Acertos', acertos: 13, descricao: 'Prêmio Fixo' },
      { nome: '12 Acertos', acertos: 12, descricao: 'Prêmio Fixo' },
      { nome: '11 Acertos', acertos: 11, descricao: 'Prêmio Fixo de Recuperação' },
    ],
    regrasPadrao: [
      'Apostas oficiais na Lotofácil (15 a 20 dezenas de 1 a 25).',
      'Premiação contempla 11, 12, 13, 14 e 15 acertos.',
      'Valores fixos (11 a 13) e percentuais (14 e 15) rateados proporcionalmente.',
      'Prestação de contas transparente com upload do comprovante.',
    ],
  },

  'Lotofácil da Independência': {
    id: 'lotofacil-independencia',
    nome: 'Lotofácil da Independência',
    modalidadeBase: 'Lotofácil',
    isEspecial: true,
    edicaoEspecialNome: 'Lotofácil da Independência — Edição Especial de Setembro',
    icone: '🇧🇷',
    universoNumeros: 25,
    minimoDezenas: 15,
    maximoDezenas: 20,
    qtdDezenasSorteadas: 15,
    valorApostaSimples: 3.5,
    mesEvento: 'Setembro (07/09)',
    regraAcumulacao: 'Não acumula — rateio obrigatório nas faixas inferiores',
    descricao: 'Concurso especial de setembro da Lotofácil. Prêmio milionário que não acumula!',
    estilo: {
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-yellow-300',
      badgeBorder: 'border-yellow-500/40',
      badgeIcon: '🇧🇷',
      destaqueColor: 'yellow',
    },
    faixas: [
      { nome: '15 Acertos', acertos: 15, descricao: 'Prêmio Principal da Independência' },
      { nome: '14 Acertos', acertos: 14, descricao: 'Faixa de Contingência se não houver 15' },
      { nome: '13 Acertos', acertos: 13, descricao: 'Prêmio Fixo' },
      { nome: '12 Acertos', acertos: 12, descricao: 'Prêmio Fixo' },
      { nome: '11 Acertos', acertos: 11, descricao: 'Prêmio Fixo' },
    ],
    regrasPadrao: [
      'Edição Especial de Setembro — NÃO ACUMULA.',
      'Caso ninguém acerte 15 dezenas, o prêmio divide entre os que acertarem 14 dezenas.',
      'Divisão estritamente proporcional às cotas pagas.',
    ],
  },

  'Quina': {
    id: 'quina',
    nome: 'Quina',
    modalidadeBase: 'Quina',
    isEspecial: false,
    icone: '🔷',
    universoNumeros: 80,
    minimoDezenas: 5,
    maximoDezenas: 15,
    qtdDezenasSorteadas: 5,
    valorApostaSimples: 3.0,
    regraAcumulacao: 'Acumula normalmente',
    descricao: 'Sorteios diários de segunda a sábado. 5 a 15 dezenas entre 80 números.',
    estilo: {
      badgeBg: 'bg-blue-500/15',
      badgeText: 'text-blue-300',
      badgeBorder: 'border-blue-500/30',
      badgeIcon: '🔷',
      destaqueColor: 'blue',
    },
    faixas: [
      { nome: 'Quina', acertos: 5, descricao: 'Prêmio Principal (5 acertos)' },
      { nome: 'Quadra', acertos: 4, descricao: 'Segunda Faixa (4 acertos)' },
      { nome: 'Terno', acertos: 3, descricao: 'Terceira Faixa (3 acertos)' },
      { nome: 'Duque', acertos: 2, descricao: 'Quarta Faixa (2 acertos)' },
    ],
    regrasPadrao: [
      'Volantes oficiais da Quina com 5 a 15 números escolhidos de 1 a 80.',
      'Premiação para 2 (Duque), 3 (Terno), 4 (Quadra) e 5 (Quina) acertos.',
      'Rateio entre cotistas confirmados.',
    ],
  },

  'Quina de São João': {
    id: 'quina-sao-joao',
    nome: 'Quina de São João',
    modalidadeBase: 'Quina',
    isEspecial: true,
    edicaoEspecialNome: 'Quina de São João — Edição Especial Junina',
    icone: '🔥',
    universoNumeros: 80,
    minimoDezenas: 5,
    maximoDezenas: 15,
    qtdDezenasSorteadas: 5,
    valorApostaSimples: 3.0,
    mesEvento: 'Junho (24/06)',
    regraAcumulacao: 'Não acumula — rateio obrigatório nas faixas inferiores',
    descricao: 'O grande bolão junino da Caixa. Prêmio milionário que não acumula no sorteio de São João.',
    estilo: {
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-300',
      badgeBorder: 'border-orange-500/40',
      badgeIcon: '🔥',
      destaqueColor: 'orange',
    },
    faixas: [
      { nome: 'Quina', acertos: 5, descricao: 'Prêmio Máximo de São João (5 acertos)' },
      { nome: 'Quadra', acertos: 4, descricao: 'Faixa de Contingência se não houver Quina (4 acertos)' },
      { nome: 'Terno', acertos: 3, descricao: 'Terceira Faixa (3 acertos)' },
      { nome: 'Duque', acertos: 2, descricao: 'Quarta Faixa (2 acertos)' },
    ],
    regrasPadrao: [
      'Concurso especial em comemoração ao dia de São João (fim de junho).',
      'NÃO ACUMULA: se ninguém acertar a Quina, divide entre os que acertarem a Quadra.',
      'Rateio proporcional às cotas quitadas antes do sorteio.',
    ],
  },

  'Dupla Sena': {
    id: 'dupla-sena',
    nome: 'Dupla Sena',
    modalidadeBase: 'Dupla Sena',
    isEspecial: false,
    icone: '🎲',
    universoNumeros: 50,
    minimoDezenas: 6,
    maximoDezenas: 15,
    qtdDezenasSorteadas: 6,
    valorApostaSimples: 3.0,
    regraAcumulacao: 'Acumula normalmente',
    descricao: 'Com apenas um bilhete, você tem o dobro de chances: são 2 sorteios por concurso.',
    estilo: {
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-300',
      badgeBorder: 'border-rose-500/30',
      badgeIcon: '🎲',
      destaqueColor: 'rose',
    },
    faixas: [
      { nome: 'Sena (1º Sorteio)', acertos: 6, descricao: 'Prêmio Principal 1º Sorteio' },
      { nome: 'Sena (2º Sorteio)', acertos: 6, descricao: 'Prêmio Principal 2º Sorteio' },
      { nome: 'Quina', acertos: 5, descricao: '5 acertos em qualquer sorteio' },
      { nome: 'Quadra', acertos: 4, descricao: '4 acertos em qualquer sorteio' },
      { nome: 'Terno', acertos: 3, descricao: '3 acertos em qualquer sorteio' },
    ],
    regrasPadrao: [
      'Cada aposta concorre em dois sorteios no mesmo concurso.',
      'Premiação para 3, 4, 5 e 6 acertos em qualquer um dos dois sorteios.',
      'Prêmio dividido entre os cotistas proporcionalmente.',
    ],
  },

  'Dupla de Páscoa': {
    id: 'dupla-pascoa',
    nome: 'Dupla de Páscoa',
    modalidadeBase: 'Dupla Sena',
    isEspecial: true,
    edicaoEspecialNome: 'Dupla de Páscoa — Edição Especial de Outono',
    icone: '🐰',
    universoNumeros: 50,
    minimoDezenas: 6,
    maximoDezenas: 15,
    qtdDezenasSorteadas: 6,
    valorApostaSimples: 3.0,
    mesEvento: 'Março/Abril (Sábado de Aleluia)',
    regraAcumulacao: 'Não acumula — rateio obrigatório nas faixas inferiores',
    descricao: 'Concurso especial da Dupla Sena realizado no sábado que antecede o Domingo de Páscoa.',
    estilo: {
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-300',
      badgeBorder: 'border-purple-500/40',
      badgeIcon: '🐰',
      destaqueColor: 'purple',
    },
    faixas: [
      { nome: 'Sena (1º Sorteio)', acertos: 6, descricao: 'Prêmio Especial 1º Sorteio' },
      { nome: 'Sena (2º Sorteio)', acertos: 6, descricao: 'Prêmio Especial 2º Sorteio' },
      { nome: 'Quina', acertos: 5, descricao: '5 acertos' },
      { nome: 'Quadra', acertos: 4, descricao: '4 acertos' },
      { nome: 'Terno', acertos: 3, descricao: '3 acertos' },
    ],
    regrasPadrao: [
      'Edição especial no sábado antes da Páscoa — NÃO ACUMULA.',
      'Se ninguém acertar 6 números no 1º sorteio, divide entre os que acertarem 5 dezenas.',
      'Rateio proporcional registrado em ata com SHA-256.',
    ],
  },
};

/**
 * Retorna os metadados de uma modalidade, com fallback inteligente para Mega-Sena.
 */
export function getModalidadeInfo(modalidadeNome: string): ModalidadeDetalhada {
  if (CATALOGO_MODALIDADES[modalidadeNome]) {
    return CATALOGO_MODALIDADES[modalidadeNome];
  }
  // Tentar encontrar por matching flexível
  const normalizado = modalidadeNome.toLowerCase();
  if (normalizado.includes('virada')) return CATALOGO_MODALIDADES['Mega da Virada'];
  if (normalizado.includes('independência') || normalizado.includes('independencia')) return CATALOGO_MODALIDADES['Lotofácil da Independência'];
  if (normalizado.includes('são joão') || normalizado.includes('sao joao')) return CATALOGO_MODALIDADES['Quina de São João'];
  if (normalizado.includes('páscoa') || normalizado.includes('pascoa')) return CATALOGO_MODALIDADES['Dupla de Páscoa'];
  if (normalizado.includes('lotofácil') || normalizado.includes('lotofacil')) return CATALOGO_MODALIDADES['Lotofácil'];
  if (normalizado.includes('quina')) return CATALOGO_MODALIDADES['Quina'];
  if (normalizado.includes('dupla')) return CATALOGO_MODALIDADES['Dupla Sena'];

  return CATALOGO_MODALIDADES['Mega-Sena'];
}

/**
 * Lista de modalidades agrupadas para seleção intuitiva na interface.
 */
export const GRUPOS_MODALIDADES = [
  {
    grupo: 'Mega-Sena',
    opcoes: ['Mega-Sena', 'Mega da Virada'],
  },
  {
    grupo: 'Lotofácil',
    opcoes: ['Lotofácil', 'Lotofácil da Independência'],
  },
  {
    grupo: 'Quina',
    opcoes: ['Quina', 'Quina de São João'],
  },
  {
    grupo: 'Dupla Sena',
    opcoes: ['Dupla Sena', 'Dupla de Páscoa'],
  },
];
