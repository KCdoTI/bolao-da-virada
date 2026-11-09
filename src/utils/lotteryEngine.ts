import { Jogo, Participante, PremiacaoFaixas, JogoConferido, RateioCotista } from '../types';

/**
 * Análise Combinatória C(n, k) = n! / (k! * (n - k)!)
 */
export function combinacao(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  const menorK = Math.min(k, n - k);
  for (let i = 1; i <= menorK; i++) {
    c = (c * (n - (menorK - i))) / i;
  }
  return Math.round(c);
}

/**
 * Calcula prêmios múltiplos conforme tabela de desdobramento oficial da Caixa Econômica Federal
 * Para uma aposta com n números (6 <= n <= 15) com m acertos (0 <= m <= 6):
 * Quantidade de prêmios de faixa k (k = 6 para Sena, 5 para Quina, 4 para Quadra):
 * C(m, k) * C(n - m, 6 - k)
 */
export function conferirJogo(
  jogo: Jogo,
  dezenasSorteadas: number[],
  valores: PremiacaoFaixas
): JogoConferido {
  const acertos = jogo.dezenas
    .filter((d) => dezenasSorteadas.includes(d))
    .sort((a, b) => a - b);

  const m = acertos.length; // quantidade de dezenas acertadas
  const n = jogo.dezenas.length; // quantidade de dezenas jogadas no volante

  // Cálculo rigoroso de desdobramentos de apostas múltiplas
  const senas = m === 6 ? combinacao(m, 6) * combinacao(n - m, 6 - 6) : 0;
  const quinas = m >= 5 ? combinacao(m, 5) * combinacao(n - m, 6 - 5) : 0;
  const quadras = m >= 4 ? combinacao(m, 4) * combinacao(n - m, 6 - 4) : 0;

  const valorTotal =
    senas * (valores.sena || 0) +
    quinas * (valores.quina || 0) +
    quadras * (valores.quadra || 0);

  return {
    jogoId: jogo.id,
    dezenas: [...jogo.dezenas].sort((a, b) => a - b),
    acertos,
    totalAcertos: m,
    premiacaoCalculada: {
      senas,
      quinas,
      quadras,
      valorTotal,
    },
    foto_url: jogo.foto_url,
  };
}

/**
 * Rateio financeiro proporcional estritamente restrito a cotistas com status "Pago"
 */
export function calcularRateio(
  participantes: Participante[],
  valorPremioTotal: number
): RateioCotista[] {
  const cotistasPagos = participantes.filter((p) => p.status_pagamento === 'Pago');
  const totalCotasPagas = cotistasPagos.reduce((acc, p) => acc + p.qtd_cotas, 0);

  const valorPorCota =
    totalCotasPagas > 0 && valorPremioTotal > 0
      ? valorPremioTotal / totalCotasPagas
      : 0;

  return participantes.map((p) => {
    if (p.status_pagamento !== 'Pago' || totalCotasPagas === 0 || valorPremioTotal === 0) {
      return {
        ...p,
        porcentagem: 0,
        valorAReceber: 0,
        valorPorCota,
      };
    }

    const porcentagem = (p.qtd_cotas / totalCotasPagas) * 100;
    const valorAReceber = p.qtd_cotas * valorPorCota;

    return {
      ...p,
      porcentagem,
      valorAReceber,
      valorPorCota,
    };
  });
}
