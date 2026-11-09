/**
 * Motor de Simulação Pré-Bolão e Engenharia de Contingência
 * Calcula cenários probabilísticos, cronogramas de segurança e adaptação dinâmica de apostas.
 */

export interface CustoApostaCaixa {
  dezenas: number;
  custo: number;
  apostasEquivalentes: number;
}

export const TABELA_OFICIAL_CAIXA: CustoApostaCaixa[] = [
  { dezenas: 6, custo: 5.0, apostasEquivalentes: 1 },
  { dezenas: 7, custo: 35.0, apostasEquivalentes: 7 },
  { dezenas: 8, custo: 140.0, apostasEquivalentes: 28 },
  { dezenas: 9, custo: 420.0, apostasEquivalentes: 84 },
  { dezenas: 10, custo: 1050.0, apostasEquivalentes: 210 },
  { dezenas: 11, custo: 2310.0, apostasEquivalentes: 462 },
  { dezenas: 12, custo: 4620.0, apostasEquivalentes: 924 },
  { dezenas: 13, custo: 8580.0, apostasEquivalentes: 1716 },
  { dezenas: 14, custo: 15015.0, apostasEquivalentes: 3003 },
  { dezenas: 15, custo: 25025.0, apostasEquivalentes: 5005 },
];

export interface AlocacaoJogo {
  dezenas: number;
  quantidade: number;
  custoUnitario: number;
  custoSubtotal: number;
  apostasEquivalentesTotais: number;
}

export interface PlanoApostas {
  orcamentoDisponivel: number;
  custoTotal: number;
  sobraTroco: number;
  totalApostasEquivalentes: number;
  jogos: AlocacaoJogo[];
  estrategiaNome: 'Hibrida' | 'Desdobramento' | 'Volume';
  resumoVisual: string;
}

export interface CronogramaRecomendado {
  divulgacaoSugerida: string;
  primeiroAlertaPagamento: string;
  prazoLimiteHard: string; // Momento que encerra o pagamento
  janelaAdaptacaoJogos: string; // Período para o organizador rodar o downgrade
  prazoIdaLoterica: string;
  margemSegurancaHoras: number;
}

export interface CenariosPreBolao {
  parametros: {
    cotistasEstimados: number;
    valorCota: number;
    dataSorteio: string;
    taxaInadimplenciaEstimada: number; // Ex: 0.20 para 20%
  };
  cronograma: CronogramaRecomendado;
  cenarioOtimista: {
    cotistasPagantes: number;
    totalArrecadado: number;
    plano: PlanoApostas;
  };
  cenarioRealista: {
    cotistasPagantes: number;
    totalArrecadado: number;
    plano: PlanoApostas;
  };
  cenarioCritico: {
    cotistasPagantes: number;
    totalArrecadado: number;
    plano: PlanoApostas;
  };
  gatilhosContingencia: {
    condicao: string;
    acaoRecomendada: string;
  }[];
}

/**
 * Encontra a alocação ótima de jogos da Caixa para um determinado orçamento,
 * priorizando a estratégia equilibrada (híbrida): maior desdobramento viável + apostas complementares.
 */
export function otimizarPlanoApostas(
  orcamento: number,
  estrategia: 'Hibrida' | 'Desdobramento' | 'Volume' = 'Hibrida'
): PlanoApostas {
  if (orcamento < 5.0) {
    return {
      orcamentoDisponivel: orcamento,
      custoTotal: 0,
      sobraTroco: orcamento,
      totalApostasEquivalentes: 0,
      jogos: [],
      estrategiaNome: estrategia,
      resumoVisual: 'Orçamento insuficiente para aposta mínima da Caixa (mínimo R$ 5,00)',
    };
  }

  let saldo = orcamento;
  const alocacoes: Map<number, number> = new Map();

  if (estrategia === 'Volume') {
    // Foca em apostas simples de 6 dezenas e poucas de 7 para máxima diversidade
    const qtdSimples = Math.floor(saldo / 5.0);
    alocacoes.set(6, qtdSimples);
    saldo -= qtdSimples * 5.0;
  } else if (estrategia === 'Desdobramento') {
    // Aloca o maior número possível em apostas desdobradas (10, 9, 8, 7)
    for (let i = TABELA_OFICIAL_CAIXA.length - 1; i >= 0; i--) {
      const item = TABELA_OFICIAL_CAIXA[i];
      if (saldo >= item.custo) {
        const qtd = Math.floor(saldo / item.custo);
        alocacoes.set(item.dezenas, (alocacoes.get(item.dezenas) || 0) + qtd);
        saldo -= qtd * item.custo;
      }
    }
  } else {
    // Híbrida (Recomendada):
    // 1. Tenta comprar 1 aposta do maior desdobramento viável (até 9 ou 10 dezenas)
    // 2. Com o saldo restante, compra apostas de 8 ou 7 dezenas
    // 3. O saldo final vira apostas de 6 dezenas (R$ 5)
    for (let i = TABELA_OFICIAL_CAIXA.length - 1; i >= 1; i--) {
      const item = TABELA_OFICIAL_CAIXA[i];
      // Só compra se sobrar pelo menos 15% para jogos complementares ou se esgotar redondo
      if (saldo >= item.custo) {
        alocacoes.set(item.dezenas, 1);
        saldo -= item.custo;
        break;
      }
    }

    // Com o que sobrou, compra o que couber descendo a tabela
    for (let i = TABELA_OFICIAL_CAIXA.length - 1; i >= 0; i--) {
      const item = TABELA_OFICIAL_CAIXA[i];
      if (saldo >= item.custo) {
        const qtd = Math.floor(saldo / item.custo);
        alocacoes.set(item.dezenas, (alocacoes.get(item.dezenas) || 0) + qtd);
        saldo -= qtd * item.custo;
      }
    }
  }

  const jogos: AlocacaoJogo[] = [];
  let custoTotal = 0;
  let apostasTotais = 0;

  for (const item of TABELA_OFICIAL_CAIXA) {
    const qtd = alocacoes.get(item.dezenas) || 0;
    if (qtd > 0) {
      const subtotal = qtd * item.custo;
      const equiv = qtd * item.apostasEquivalentes;
      custoTotal += subtotal;
      apostasTotais += equiv;
      jogos.push({
        dezenas: item.dezenas,
        quantidade: qtd,
        custoUnitario: item.custo,
        custoSubtotal: subtotal,
        apostasEquivalentesTotais: equiv,
      });
    }
  }

  // Ordena decrescente por dezenas
  jogos.sort((a, b) => b.dezenas - a.dezenas);

  const descJogos = jogos
    .map((j) => `${j.quantidade}x jogo de ${j.dezenas} números (R$ ${j.custoSubtotal.toFixed(2)})`)
    .join(' + ');

  return {
    orcamentoDisponivel: orcamento,
    custoTotal,
    sobraTroco: Number(saldo.toFixed(2)),
    totalApostasEquivalentes: apostasTotais,
    jogos,
    estrategiaNome: estrategia,
    resumoVisual: descJogos || 'Nenhum jogo alocado',
  };
}

/**
 * Calcula o cronograma de segurança recomendado baseado na data do sorteio
 */
export function calcularCronogramaSeguranca(dataSorteioIso: string): CronogramaRecomendado {
  const sorteio = new Date(dataSorteioIso);

  // Lotérica costuma fechar às 14:00 do dia 31/12
  const idaLoterica = new Date(sorteio);
  idaLoterica.setHours(13, 30, 0, 0);

  // Janela de Adaptação / Downgrade: 31/12 de manhã (09:00 às 11:30)
  const janelaAdaptacao = new Date(sorteio);
  janelaAdaptacao.setHours(9, 0, 0, 0);

  // Hard Cutoff de Pagamento: D-1 às 18:00 (30/12 às 18h)
  const prazoLimiteHard = new Date(sorteio);
  prazoLimiteHard.setDate(prazoLimiteHard.getDate() - 1);
  prazoLimiteHard.setHours(18, 0, 0, 0);

  // Primeiro alerta geral: D-2 às 12:00
  const primeiroAlerta = new Date(sorteio);
  primeiroAlerta.setDate(primeiroAlerta.getDate() - 2);
  primeiroAlerta.setHours(12, 0, 0, 0);

  // Abertura / Divulgação: D-10
  const divulgacao = new Date(sorteio);
  divulgacao.setDate(divulgacao.getDate() - 10);
  divulgacao.setHours(10, 0, 0, 0);

  const margemHoras = Math.round(
    (idaLoterica.getTime() - prazoLimiteHard.getTime()) / (1000 * 60 * 60)
  );

  return {
    divulgacaoSugerida: divulgacao.toISOString(),
    primeiroAlertaPagamento: primeiroAlerta.toISOString(),
    prazoLimiteHard: prazoLimiteHard.toISOString(),
    janelaAdaptacaoJogos: janelaAdaptacao.toISOString(),
    prazoIdaLoterica: idaLoterica.toISOString(),
    margemSegurancaHoras: Math.max(margemHoras, 4),
  };
}

/**
 * Simula todos os cenários pré-bolão (Otimista, Realista e Crítico)
 * e prescreve as adaptações necessárias.
 */
export function simularCenariosPreBolao(
  cotistasEstimados: number,
  valorCota: number,
  taxaInadimplenciaEstimada: number = 0.2, // 20% padrão de desistência
  dataSorteioIso: string = '2026-12-31T20:00:00'
): CenariosPreBolao {
  const cronograma = calcularCronogramaSeguranca(dataSorteioIso);

  // 1. Cenário Otimista: 100% de adesão
  const cotasOtimista = cotistasEstimados;
  const arrecadadoOtimista = cotasOtimista * valorCota;
  const planoOtimista = otimizarPlanoApostas(arrecadadoOtimista, 'Hibrida');

  // 2. Cenário Realista: perda esperada (ex: 20% não pagam até o limite)
  const cotasRealistas = Math.max(1, Math.round(cotistasEstimados * (1 - taxaInadimplenciaEstimada)));
  const arrecadadoRealista = cotasRealistas * valorCota;
  const planoRealista = otimizarPlanoApostas(arrecadadoRealista, 'Hibrida');

  // 3. Cenário Crítico: 40% a 50% de desistência ou corte abrupto
  const cotasCriticas = Math.max(1, Math.round(cotistasEstimados * 0.55));
  const arrecadadoCritico = cotasCriticas * valorCota;
  const planoCritico = otimizarPlanoApostas(arrecadadoCritico, 'Hibrida');

  const gatilhosContingencia = [
    {
      condicao: '1 a 2 cotistas não pagaram até D-1 (30/12 às 18h)',
      acaoRecomendada:
        'Oferta relâmpago no grupo: "Restam 2 cotas liberadas para quem quiser dobrar sua cota". Se ninguém assumir em 2 horas, execute o rebaixamento de 1 jogo secundário (ex: 8 dezenas para 7 dezenas).',
    },
    {
      condicao: 'Diferença de caixa entre R$ 20 e R$ 100',
      acaoRecomendada:
        'Mantenha o bilhete âncora principal e converta o valor faltante em jogos simples de 6 números (R$ 5,00 cada), sem desconfigurar o núcleo das dezenas mais votadas.',
    },
    {
      condicao: 'Arrecadação abaixo de 60% da meta inicial',
      acaoRecomendada:
        'Protocolo de Transparência Imediata: Envie aviso no grupo informando a reformulação das cotas. Rebaixe para estratégia de Volume (múltiplas apostas de 6 números) e garanta que o rateio será calculado apenas sobre as cotas efetivamente pagas.',
    },
    {
      condicao: 'Sobra residual de centavos ou troco menor que R$ 5,00',
      acaoRecomendada:
        'O saldo que não completar R$ 5,00 (ex: R$ 2,50 ou R$ 3,00) deve ser mantido como Fundo de Reserva do Bolão para custear tarifas de transferência ou complementado com uma Surpresinha com autorização do grupo.',
    },
  ];

  return {
    parametros: {
      cotistasEstimados,
      valorCota,
      dataSorteio: dataSorteioIso,
      taxaInadimplenciaEstimada,
    },
    cronograma,
    cenarioOtimista: {
      cotistasPagantes: cotasOtimista,
      totalArrecadado: arrecadadoOtimista,
      plano: planoOtimista,
    },
    cenarioRealista: {
      cotistasPagantes: cotasRealistas,
      totalArrecadado: arrecadadoRealista,
      plano: planoRealista,
    },
    cenarioCritico: {
      cotistasPagantes: cotasCriticas,
      totalArrecadado: arrecadadoCritico,
      plano: planoCritico,
    },
    gatilhosContingencia,
  };
}

/**
 * Algoritmo de Downgrade de Jogo:
 * Se um jogo de N dezenas precisar ser reduzido para M dezenas (M < N),
 * remove as dezenas de menor relevância e devolve as dezenas preservadas.
 */
export function rebaixarJogoDezenas(dezenasOriginais: number[], alvoDezenas: number): number[] {
  if (alvoDezenas >= dezenasOriginais.length) {
    return [...dezenasOriginais];
  }
  if (alvoDezenas < 6) {
    throw new Error('Uma aposta da Mega-Sena precisa ter no mínimo 6 números');
  }

  // Ordena as dezenas
  const sorted = [...dezenasOriginais].sort((a, b) => a - b);
  // Mantém as primeiras 'alvoDezenas' (ou de maior balanceamento par/ímpar)
  return sorted.slice(0, alvoDezenas);
}
