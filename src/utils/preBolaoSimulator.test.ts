import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  otimizarPlanoApostas,
  calcularCronogramaSeguranca,
  simularCenariosPreBolao,
  rebaixarJogoDezenas,
  TABELA_OFICIAL_CAIXA,
} from './preBolaoSimulator';

test('TABELA_OFICIAL_CAIXA contains standard Caixa rules and costs', () => {
  assert.equal(TABELA_OFICIAL_CAIXA[0].dezenas, 6);
  assert.equal(TABELA_OFICIAL_CAIXA[0].custo, 6.0);
  assert.equal(TABELA_OFICIAL_CAIXA[1].dezenas, 7);
  assert.equal(TABELA_OFICIAL_CAIXA[1].custo, 42.0);
  assert.equal(TABELA_OFICIAL_CAIXA[2].dezenas, 8);
  assert.equal(TABELA_OFICIAL_CAIXA[2].custo, 168.0);
  assert.equal(TABELA_OFICIAL_CAIXA[3].dezenas, 9);
  assert.equal(TABELA_OFICIAL_CAIXA[3].custo, 504.0);
});

test('otimizarPlanoApostas allocates games without exceeding budget and minimizes change', () => {
  const orcamento = 700.0;
  const plano = otimizarPlanoApostas(orcamento, 'Hibrida');

  assert.ok(plano.custoTotal <= orcamento);
  assert.ok(plano.sobraTroco < 6.0, 'Sobra de troco deve ser menor que o preço de uma aposta simples');
  assert.ok(plano.jogos.length > 0);
  assert.ok(plano.totalApostasEquivalentes >= 28);
});

test('calcularCronogramaSeguranca establishes clear safety buffers before lottery closing', () => {
  const sorteio = '2026-12-31T20:00:00';
  const cronograma = calcularCronogramaSeguranca(sorteio);

  const limiteDate = new Date(cronograma.prazoLimiteHard);
  const lotericaDate = new Date(cronograma.prazoIdaLoterica);

  assert.ok(
    lotericaDate.getTime() > limiteDate.getTime(),
    'O prazo de ida à lotérica deve ser posterior ao encerramento de pagamentos'
  );
  assert.ok(cronograma.margemSegurancaHoras >= 12, 'Deve haver margem de pelo menos 12 horas para adaptação');
});

test('simularCenariosPreBolao generates realistic and critical fallback plans', () => {
  const cenarios = simularCenariosPreBolao(20, 50, 0.2, '2026-12-31T20:00:00');

  // Otimista: 20 * 50 = 1000
  assert.equal(cenarios.cenarioOtimista.cotistasPagantes, 20);
  assert.equal(cenarios.cenarioOtimista.totalArrecadado, 1000);

  // Realista: 80% de 20 = 16 cotistas = 800
  assert.equal(cenarios.cenarioRealista.cotistasPagantes, 16);
  assert.equal(cenarios.cenarioRealista.totalArrecadado, 800);

  // Crítico: 55% de 20 = 11 cotistas = 550
  assert.equal(cenarios.cenarioCritico.cotistasPagantes, 11);
  assert.equal(cenarios.cenarioCritico.totalArrecadado, 550);

  assert.ok(cenarios.gatilhosContingencia.length >= 3);
});

test('rebaixarJogoDezenas smoothly reduces bet size preserving core numbers', () => {
  const dezenasOriginal = [5, 10, 18, 25, 34, 42, 51, 59]; // 8 dezenas
  const rebaixado = rebaixarJogoDezenas(dezenasOriginal, 7);

  assert.equal(rebaixado.length, 7);
  assert.deepEqual(rebaixado, [5, 10, 18, 25, 34, 42, 51]);

  // Não permite menos de 6 dezenas
  assert.throws(() => rebaixarJogoDezenas(dezenasOriginal, 5));
});
