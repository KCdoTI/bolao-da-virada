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

test('buildWhatsAppReminderGroupMessage formats reminder with pending counts and pix', async () => {
  const { buildWhatsAppReminderGroupMessage, buildWhatsAppIndividualReminderMessage, buildWhatsAppDirectUrl } = await import('./transparency');
  const mockBolao: Bolao = {
    id: 'b-test',
    nome: 'Bolão dos Amigos',
    modalidade: 'Mega da Virada',
    concurso_numero: 2810,
    valor_cota: 50,
    data_limite: '2026-12-31T17:00:00',
    chave_pix_organizador: 'organizador@pix.com',
    status: 'aberto',
    hash_slug: 'b-test-hash',
  };
  const pendentes: Participante[] = [
    { id: '1', bolao_id: 'b-test', nome: 'Fernanda', telefone: '(31) 98456-7890', qtd_cotas: 2, status_pagamento: 'Pendente' },
    { id: '2', bolao_id: 'b-test', nome: 'Guilherme', telefone: '(81) 99334-5566', qtd_cotas: 1, status_pagamento: 'Pendente' },
  ];

  const groupMsg = buildWhatsAppReminderGroupMessage(mockBolao, pendentes, 'https://test.app/#b-test');
  assert.ok(groupMsg.includes('BOLÃO DOS AMIGOS'));
  assert.ok(groupMsg.includes('Cotas a confirmar: 3 cota(s) (Total: R$ 150.00)'));
  assert.ok(groupMsg.includes('organizador@pix.com'));
  assert.ok(groupMsg.includes('https://test.app/#b-test'));

  const indMsg = buildWhatsAppIndividualReminderMessage(pendentes[0], mockBolao, 'https://test.app/#b-test');
  assert.ok(indMsg.includes('Olá Fernanda!'));
  assert.ok(indMsg.includes('2 cotas'));
  assert.ok(indMsg.includes('R$ 100.00'));
  assert.ok(indMsg.includes('organizador@pix.com'));

  const directUrl = buildWhatsAppDirectUrl('(31) 98456-7890', 'Olá');
  assert.ok(directUrl.startsWith('https://wa.me/5531984567890?text='));
});

test('conferirJogo on Lotofácil 16-number bet hitting 15 yields 1 of 15 and 15 of 14', () => {
  // Aposta de 16 dezenas na Lotofácil acertando as 15 sorteadas:
  // C(15, 15) * C(1, 0) = 1 de 15 pontos
  // C(15, 14) * C(1, 1) = 15 de 14 pontos
  const dezenasSorteadas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const jogoLoto: Jogo = {
    id: 'loto-1',
    bolao_id: 'b-loto',
    dezenas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    criado_em: '2026-09-07',
  };
  const premiosLoto: PremiacaoFaixas = {
    pontos15: 2000000,
    pontos14: 1500,
    pontos13: 32,
    pontos12: 13,
    pontos11: 7,
  };

  const res = conferirJogo(jogoLoto, dezenasSorteadas, premiosLoto, 'Lotofácil');
  assert.equal(res.totalAcertos, 15);
  assert.equal(res.premiacaoCalculada.pontos15, 1);
  assert.equal(res.premiacaoCalculada.pontos14, 15);
  assert.equal(res.premiacaoCalculada.pontos13, 0);
  assert.equal(res.premiacaoCalculada.valorTotal, 1 * 2000000 + 15 * 1500);
});

test('conferirJogo on Quina 7-number bet hitting 4 yields 3 Quadras, 12 Ternos and 6 Duques', () => {
  // Aposta de 7 dezenas na Quina acertando 4 números:
  // C(4, 4) * C(3, 1) = 3 Quadras
  // C(4, 3) * C(3, 2) = 12 Ternos
  // C(4, 2) * C(3, 3) = 6 Duques
  const dezenasSorteadas = [10, 20, 30, 40, 50];
  const jogoQuina: Jogo = {
    id: 'quina-1',
    bolao_id: 'b-quina',
    dezenas: [10, 20, 30, 40, 60, 70, 80], // acertos: 10, 20, 30, 40 (4 acertos)
    criado_em: '2026-06-24',
  };
  const premiosQuina: PremiacaoFaixas = {
    quina: 15000000,
    quadra: 8000,
    terno: 120,
    duque: 5,
  };

  const res = conferirJogo(jogoQuina, dezenasSorteadas, premiosQuina, 'Quina');
  assert.equal(res.totalAcertos, 4);
  assert.equal(res.premiacaoCalculada.quinas, 0);
  assert.equal(res.premiacaoCalculada.quadras, 3);
  assert.equal(res.premiacaoCalculada.ternos, 12);
  assert.equal(res.premiacaoCalculada.duques, 6);
  assert.equal(res.premiacaoCalculada.valorTotal, 3 * 8000 + 12 * 120 + 6 * 5);
});

test('parseCaixaTicketText parses Lotofácil and Quina sample tickets properly', () => {
  const lotofacilTicket = SAMPLE_TICKETS[2];
  const candidatesLoto = parseCaixaTicketText(lotofacilTicket.rawText, 'Lotofácil');
  assert.ok(candidatesLoto.length > 0);
  assert.equal(candidatesLoto[0].dezenas.length, 15);
  assert.deepEqual(candidatesLoto[0].dezenas, lotofacilTicket.dezenasEsperadas);

  const quinaTicket = SAMPLE_TICKETS[3];
  const candidatesQuina = parseCaixaTicketText(quinaTicket.rawText, 'Quina');
  assert.ok(candidatesQuina.length > 0);
  assert.equal(candidatesQuina[0].dezenas.length, 5);
  assert.deepEqual(candidatesQuina[0].dezenas, quinaTicket.dezenasEsperadas);
});
