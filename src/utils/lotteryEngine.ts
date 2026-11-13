import { Jogo, Participante, PremiacaoFaixas, JogoConferido, RateioCotista, DetalheFaixaPremiacao } from '../types';

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
 * Calcula prêmios múltiplos conforme tabela oficial de desdobramento hipergeométrico da Caixa:
 * Para aposta com n números marcados, m acertos entre as s dezenas sorteadas da modalidade:
 * Qtd Prêmios Faixa k = C(m, k) * C(n - m, s - k)
 *
 * Suporta nativamente:
 * - Mega-Sena e Mega da Virada (s = 6; faixas 6, 5, 4)
 * - Quina e Quina de São João (s = 5; faixas 5, 4, 3, 2)
 * - Lotofácil e Lotofácil da Independência (s = 15; faixas 15, 14, 13, 12, 11 com prêmios fixos)
 * - Dupla Sena e Dupla de Páscoa (s = 6; faixas 6, 5, 4, 3)
 */
export function conferirJogo(
  jogo: Jogo,
  dezenasSorteadas: number[],
  valores: PremiacaoFaixas,
  modalidade: string = 'Mega-Sena'
): JogoConferido {
  const acertos = jogo.dezenas
    .filter((d) => dezenasSorteadas.includes(d))
    .sort((a, b) => a - b);

  const m = acertos.length; // quantidade de dezenas acertadas
  const n = jogo.dezenas.length; // quantidade de dezenas jogadas no volante

  const modNorm = modalidade.toLowerCase();
  const isLotofacil = modNorm.includes('lotofácil') || modNorm.includes('lotofacil');
  const isQuina = modNorm.includes('quina');
  const isDupla = modNorm.includes('dupla');

  const detalhesFaixas: DetalheFaixaPremiacao[] = [];
  let valorTotal = 0;

  let senas = 0;
  let quinas = 0;
  let quadras = 0;
  let ternos = 0;
  let duques = 0;
  let pontos15 = 0;
  let pontos14 = 0;
  let pontos13 = 0;
  let pontos12 = 0;
  let pontos11 = 0;

  if (isLotofacil) {
    // Lotofácil: s = 15
    const s = 15;
    pontos15 = m >= 15 ? combinacao(m, 15) * combinacao(n - m, s - 15) : 0;
    pontos14 = m >= 14 ? combinacao(m, 14) * combinacao(n - m, s - 14) : 0;
    pontos13 = m >= 13 ? combinacao(m, 13) * combinacao(n - m, s - 13) : 0;
    pontos12 = m >= 12 ? combinacao(m, 12) * combinacao(n - m, s - 12) : 0;
    pontos11 = m >= 11 ? combinacao(m, 11) * combinacao(n - m, s - 11) : 0;

    // Prêmios fixos oficiais da Caixa para 11, 12 e 13
    const v15 = valores.pontos15 || 0;
    const v14 = valores.pontos14 || 0;
    const v13 = valores.pontos13 !== undefined ? valores.pontos13 : 32.0;
    const v12 = valores.pontos12 !== undefined ? valores.pontos12 : 13.0;
    const v11 = valores.pontos11 !== undefined ? valores.pontos11 : 7.0;

    if (pontos15 > 0) detalhesFaixas.push({ faixaNome: '15 Acertos', acertosNecessarios: 15, qtdPremios: pontos15, valorUnitario: v15, subtotal: pontos15 * v15 });
    if (pontos14 > 0) detalhesFaixas.push({ faixaNome: '14 Acertos', acertosNecessarios: 14, qtdPremios: pontos14, valorUnitario: v14, subtotal: pontos14 * v14 });
    if (pontos13 > 0) detalhesFaixas.push({ faixaNome: '13 Acertos (Fixo)', acertosNecessarios: 13, qtdPremios: pontos13, valorUnitario: v13, subtotal: pontos13 * v13 });
    if (pontos12 > 0) detalhesFaixas.push({ faixaNome: '12 Acertos (Fixo)', acertosNecessarios: 12, qtdPremios: pontos12, valorUnitario: v12, subtotal: pontos12 * v12 });
    if (pontos11 > 0) detalhesFaixas.push({ faixaNome: '11 Acertos (Fixo)', acertosNecessarios: 11, qtdPremios: pontos11, valorUnitario: v11, subtotal: pontos11 * v11 });

    valorTotal = pontos15 * v15 + pontos14 * v14 + pontos13 * v13 + pontos12 * v12 + pontos11 * v11;
  } else if (isQuina) {
    // Quina: s = 5
    const s = 5;
    quinas = m >= 5 ? combinacao(m, 5) * combinacao(n - m, s - 5) : 0;
    quadras = m >= 4 ? combinacao(m, 4) * combinacao(n - m, s - 4) : 0;
    ternos = m >= 3 ? combinacao(m, 3) * combinacao(n - m, s - 3) : 0;
    duques = m >= 2 ? combinacao(m, 2) * combinacao(n - m, s - 2) : 0;

    const vQuina = valores.quina || 0;
    const vQuadra = valores.quadra || 0;
    const vTerno = valores.terno || 0;
    const vDuque = valores.duque || 0;

    if (quinas > 0) detalhesFaixas.push({ faixaNome: 'Quina', acertosNecessarios: 5, qtdPremios: quinas, valorUnitario: vQuina, subtotal: quinas * vQuina });
    if (quadras > 0) detalhesFaixas.push({ faixaNome: 'Quadra', acertosNecessarios: 4, qtdPremios: quadras, valorUnitario: vQuadra, subtotal: quadras * vQuadra });
    if (ternos > 0) detalhesFaixas.push({ faixaNome: 'Terno', acertosNecessarios: 3, qtdPremios: ternos, valorUnitario: vTerno, subtotal: ternos * vTerno });
    if (duques > 0) detalhesFaixas.push({ faixaNome: 'Duque', acertosNecessarios: 2, qtdPremios: duques, valorUnitario: vDuque, subtotal: duques * vDuque });

    valorTotal = quinas * vQuina + quadras * vQuadra + ternos * vTerno + duques * vDuque;
  } else {
    // Mega-Sena ou Dupla Sena: s = 6
    const s = 6;
    senas = m === 6 ? combinacao(m, 6) * combinacao(n - m, s - 6) : 0;
    quinas = m >= 5 ? combinacao(m, 5) * combinacao(n - m, s - 5) : 0;
    quadras = m >= 4 ? combinacao(m, 4) * combinacao(n - m, s - 4) : 0;

    const vSena = valores.sena || 0;
    const vQuina = valores.quina || 0;
    const vQuadra = valores.quadra || 0;

    if (senas > 0) detalhesFaixas.push({ faixaNome: 'Sena', acertosNecessarios: 6, qtdPremios: senas, valorUnitario: vSena, subtotal: senas * vSena });
    if (quinas > 0) detalhesFaixas.push({ faixaNome: 'Quina', acertosNecessarios: 5, qtdPremios: quinas, valorUnitario: vQuina, subtotal: quinas * vQuina });
    if (quadras > 0) detalhesFaixas.push({ faixaNome: 'Quadra', acertosNecessarios: 4, qtdPremios: quadras, valorUnitario: vQuadra, subtotal: quadras * vQuadra });

    if (isDupla) {
      ternos = m >= 3 ? combinacao(m, 3) * combinacao(n - m, s - 3) : 0;
      const vTerno = valores.terno || 0;
      if (ternos > 0) detalhesFaixas.push({ faixaNome: 'Terno', acertosNecessarios: 3, qtdPremios: ternos, valorUnitario: vTerno, subtotal: ternos * vTerno });
      valorTotal = senas * vSena + quinas * vQuina + quadras * vQuadra + ternos * vTerno;
    } else {
      valorTotal = senas * vSena + quinas * vQuina + quadras * vQuadra;
    }
  }

  return {
    jogoId: jogo.id,
    dezenas: [...jogo.dezenas].sort((a, b) => a - b),
    acertos,
    totalAcertos: m,
    premiacaoCalculada: {
      senas,
      quinas,
      quadras,
      ternos,
      duques,
      pontos15,
      pontos14,
      pontos13,
      pontos12,
      pontos11,
      detalhesFaixas,
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
