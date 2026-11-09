import test from 'node:test';
import assert from 'node:assert/strict';
import { combinacao, conferirJogo, calcularRateio } from './lotteryEngine';
import { maskPhone, buildWhatsAppShareMessage } from './transparency';
import { parseCaixaTicketText, SAMPLE_TICKETS } from './lotteryOcrParser';
import { Jogo, Participante, PremiacaoFaixas, Bolao } from '../types';

test('combinacao C(n, k) calculations', () => {
  assert.equal(combinacao(6, 6), 1);
  assert.equal(combinacao(6, 5), 6);
  assert.equal(combinacao(6, 4), 15);
  assert.equal(combinacao(7, 5), 21);
  assert.equal(combinacao(7, 6), 7);
  assert.equal(combinacao(8, 6), 28);
  assert.equal(combinacao(5, 6), 0);
});

test('conferirJogo on standard 6-number bet', () => {
  const jogo: Jogo = {
    id: 'j1',
    bolao_id: 'b1',
    dezenas: [5, 10, 18, 34, 42, 59],
    criado_em: '2026-12-15',
  };
  const dezenasSorteadas = [5, 10, 18, 34, 42, 59];
  const premios: PremiacaoFaixas = {
    sena: 550000000,
    quina: 70000,
    quadra: 1200,
  };

  const res = conferirJogo(jogo, dezenasSorteadas, premios);
  assert.equal(res.totalAcertos, 6);
  assert.equal(res.premiacaoCalculada.senas, 1);
  assert.equal(res.premiacaoCalculada.quinas, 0);
  assert.equal(res.premiacaoCalculada.quadras, 0);
  assert.equal(res.premiacaoCalculada.valorTotal, 550000000);
});

test('conferirJogo on 7-number bet with 5 hits (Caixa multi-prize desdobramento)', () => {
  // A bet with 7 numbers hitting 5 yields:
  // C(5, 5) * C(2, 1) = 2 Quinas
  // C(5, 4) * C(2, 2) = 5 Quadras
  const jogo: Jogo = {
    id: 'j2',
    bolao_id: 'b1',
    dezenas: [3, 5, 10, 18, 34, 42, 60], // hits: 5, 10, 18, 34, 42 (5 hits)
    criado_em: '2026-12-18',
  };
  const dezenasSorteadas = [5, 10, 18, 34, 42, 59];
  const premios: PremiacaoFaixas = {
    sena: 500000000,
    quina: 60000,
    quadra: 1000,
  };

  const res = conferirJogo(jogo, dezenasSorteadas, premios);
  assert.equal(res.totalAcertos, 5);
  assert.equal(res.premiacaoCalculada.senas, 0);
  assert.equal(res.premiacaoCalculada.quinas, 2);
  assert.equal(res.premiacaoCalculada.quadras, 5);
  assert.equal(res.premiacaoCalculada.valorTotal, 2 * 60000 + 5 * 1000);
});

test('calcularRateio restricts payout strictly to paid participants', () => {
  const participantes: Participante[] = [
    { id: '1', bolao_id: 'b1', nome: 'Alice', telefone: '(11) 98888-1111', qtd_cotas: 2, status_pagamento: 'Pago' },
    { id: '2', bolao_id: 'b1', nome: 'Bob', telefone: '(11) 97777-2222', qtd_cotas: 3, status_pagamento: 'Pago' },
    { id: '3', bolao_id: 'b1', nome: 'Charlie', telefone: '(21) 99999-3333', qtd_cotas: 5, status_pagamento: 'Pendente' },
  ];

  // Total paid cotas = 2 + 3 = 5. Charlie is pending so gets 0.
  const rateio = calcularRateio(participantes, 100000);
  const alice = rateio.find((p) => p.id === '1')!;
  const bob = rateio.find((p) => p.id === '2')!;
  const charlie = rateio.find((p) => p.id === '3')!;

  assert.equal(alice.porcentagem, 40); // 2/5 = 40%
  assert.equal(alice.valorAReceber, 40000);

  assert.equal(bob.porcentagem, 60); // 3/5 = 60%
  assert.equal(bob.valorAReceber, 60000);

  assert.equal(charlie.porcentagem, 0);
  assert.equal(charlie.valorAReceber, 0);
});

test('maskPhone hides central digits for LGPD privacy', () => {
  assert.equal(maskPhone('(11) 98765-4321'), '(11) 9****-4321');
  assert.equal(maskPhone('(21) 3456-7890'), '(21) ****-7890');
  assert.equal(maskPhone('11987654321'), '(11) 9****-4321');
});

test('parseCaixaTicketText extracts valid Mega-Sena numbers from thermal ticket string', () => {
  const candidates = parseCaixaTicketText(SAMPLE_TICKETS[0].rawText);
  assert.ok(candidates.length > 0);
  assert.deepEqual(candidates[0].dezenas, [5, 10, 18, 34, 42, 59]);

  const candidates2 = parseCaixaTicketText(SAMPLE_TICKETS[1].rawText);
  assert.ok(candidates2.length > 0);
  assert.deepEqual(candidates2[0].dezenas, [3, 10, 18, 34, 42, 55, 60]);
});
