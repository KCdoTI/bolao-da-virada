import test from 'node:test';
import assert from 'node:assert/strict';
import { analisarCoberturaBolao, gerarJogoEstrategico } from './aiStrategyEngine';
import { Jogo } from '../types';

test('analisarCoberturaBolao correctly calculates unique numbers and coverage %', () => {
  const jogos: Jogo[] = [
    { id: '1', bolao_id: 'b', dezenas: [5, 10, 18, 34, 42, 59], criado_em: '2026-12-01' },
    { id: '2', bolao_id: 'b', dezenas: [5, 10, 18, 25, 34, 42], criado_em: '2026-12-02' },
  ];

  const analise = analisarCoberturaBolao(jogos);
  assert.equal(analise.totalJogos, 2);
  assert.equal(analise.totalDezenasJogadas, 12);
  // Unique numbers: 5, 10, 18, 25, 34, 42, 59 = 7 numbers
  assert.equal(analise.dezenasUnicasCobertas.length, 7);
  assert.equal(analise.percentualCobertura, Math.round((7 / 60) * 100));
  assert.ok(analise.diagnosticoIa.length > 0);
});

test('gerarJogoEstrategico produces 6 to 15 unique numbers adhering to strategy', () => {
  const jogoEquilibrio = gerarJogoEstrategico('equilibrio', 6);
  assert.equal(jogoEquilibrio.dezenas.length, 6);
  // All numbers must be 1 to 60
  jogoEquilibrio.dezenas.forEach((d) => {
    assert.ok(d >= 1 && d <= 60);
  });
  // Must be strictly unique
  const unique = new Set(jogoEquilibrio.dezenas);
  assert.equal(unique.size, 6);
  // Balanced: 3 pares / 3 impares
  assert.equal(jogoEquilibrio.estatisticas.pares, 3);
  assert.equal(jogoEquilibrio.estatisticas.impares, 3);

  const jogoHistorico = gerarJogoEstrategico('historica', 7);
  assert.equal(jogoHistorico.dezenas.length, 7);
  assert.equal(new Set(jogoHistorico.dezenas).size, 7);

  const jogoEspalhado = gerarJogoEstrategico('espalhada', 8);
  assert.equal(jogoEspalhado.dezenas.length, 8);
  assert.equal(new Set(jogoEspalhado.dezenas).size, 8);
});
