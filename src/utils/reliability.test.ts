import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sqliteStore } from "../../server/store";
import { createPool, readPool, updatePool } from "../../server/poolService";
import { fetchOfficialDraw, parseOfficialDraw } from "../../server/caixa";
import { conferirJogo, calcularRateio } from "./lotteryEngine";
import { parseCaixaTicketText } from "./lotteryOcrParser";
import { calculateSha256, generateCanonicalManifest } from "./transparency";
import type { PoolState, Participante } from "../types";
const state = (): PoolState => ({
  bolao: {
    id: "new",
    hash_slug: "new",
    nome: "Teste",
    modalidade: "Mega-Sena",
    concurso_numero: 1,
    valor_cota: 12,
    data_limite: new Date(Date.now() + 86400000).toISOString(),
    chave_pix_organizador: "privado",
    status: "aberto",
    regras: ["Cotas pagas"],
  },
  participantes: [],
  jogos: [],
});
const member = (id: string, pool: string): Participante => ({
  id,
  bolao_id: pool,
  nome: id,
  telefone: "11999999999",
  qtd_cotas: 1,
  status_pagamento: "Pago",
});
const fixture = (dupla = false) => ({
  numero: 1,
  dataApuracao: "01/11/2026",
  listaDezenas: ["01", "02", "03", "04", "05", "06"],
  ...(dupla
    ? { listaDezenasSegundoSorteio: ["07", "08", "09", "10", "11", "12"] }
    : {}),
  listaRateioPremio: Array.from({ length: dupla ? 8 : 3 }, (_, i) => ({
    faixa: i + 1,
    valorPremio: i === 0 ? 0 : 10,
  })),
});

test("persistência após reabrir banco, autorização, privacidade, conflito e congelamento", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "bolao-test-"));
  let db = await sqliteStore(join(dir, "data.sqlite"));
  t.after(() => {
    db.close?.();
    rmSync(dir, { recursive: true, force: true });
  });
  const created = await createPool(db, state()),
    secret = created.adminToken;
  const payload: PoolState = {
    bolao: created.bolao,
    participantes: [
      member("a", created.bolao.id),
      member("b", created.bolao.id),
    ],
    jogos: [
      {
        id: "j",
        bolao_id: created.bolao.id,
        dezenas: [1, 2, 3, 4, 5, 6],
        criado_em: new Date().toISOString(),
      },
    ],
  };
  await assert.rejects(
    updatePool(db, "", payload, 1),
    /organizador necessário/,
  );
  await assert.rejects(updatePool(db, "x".repeat(43), payload, 1), /inválido/);
  const updated = await updatePool(db, secret, payload, 1);
  assert.ok(updated.participantes[0].pago_em);
  assert.equal(updated.participantes[0].token_acesso?.length, 43);
  await assert.rejects(updatePool(db, secret, payload, 1), /Outra sessão/);
  db.close?.();
  db = await sqliteStore(join(dir, "data.sqlite"));
  const publicData = await readPool(db, created.bolao.hash_slug);
  assert.equal(publicData.jogos.length, 1);
  assert.equal(publicData.participantes.length, 0);
  assert.equal(publicData.bolao.chave_pix_organizador, "");
  assert.ok(!JSON.stringify(publicData).includes(secret));
  assert.ok(!JSON.stringify(publicData).includes("11999999999"));
  const personal = await readPool(
    db,
    created.bolao.hash_slug,
    undefined,
    updated.participantes[0].token_acesso,
  );
  assert.equal(personal.participantes.length, 1);
  assert.equal(personal.participantes[0].id, "a");
  await assert.rejects(
    readPool(db, created.bolao.hash_slug, undefined, "wrong"),
    /não encontrado/,
  );
  const closed = await updatePool(
    db,
    secret,
    { ...updated, bolao: { ...updated.bolao, status: "encerrado" } },
    2,
    "fechado",
  );
  assert.ok(closed.bolao.fechado_em);
  await assert.rejects(
    updatePool(db, secret, { ...closed, participantes: [] }, 3),
    /congelados/,
  );
  await assert.rejects(
    updatePool(
      db,
      secret,
      { ...closed, bolao: { ...closed.bolao, status: "aberto" } },
      3,
    ),
    /reaberto/,
  );
  const forged = parseOfficialDraw(
    fixture(),
    "Mega-Sena",
    1,
    "https://servicebus2.caixa.gov.br/test",
  );
  await assert.rejects(
    updatePool(
      db,
      secret,
      { ...closed, bolao: { ...closed.bolao, resultado: forged } },
      3,
    ),
    /diretamente da Caixa/,
  );
  const manual = {
    ...forged,
    origem: "manual" as const,
    sorteios: [
      {
        dezenas: [1, 2, 3, 4, 5, 6],
        premiacao: { sena: 100, quina: 0, quadra: 0 },
      },
    ],
  };
  const settled = await updatePool(
    db,
    secret,
    { ...closed, bolao: { ...closed.bolao, resultado: manual } },
    3,
    "resultado_manual",
  );
  const personalAfter: any = await readPool(
    db,
    created.bolao.hash_slug,
    undefined,
    updated.participantes[0].token_acesso,
  );
  assert.equal(personalAfter.rateioPessoal, 50);
  const rotated = await updatePool(db, secret, settled, 4, "revogar_link");
  await assert.rejects(readPool(db, created.bolao.hash_slug), /não encontrado/);
  assert.equal(
    (await readPool(db, rotated.bolao.hash_slug)).bolao.resultado?.origem,
    "manual",
  );
});
test("prazo passado impede mudar pagamentos mesmo sem fechamento explícito", async () => {
  const db = await sqliteStore(":memory:");
  try {
    const created = await createPool(db, {
      ...state(),
      bolao: { ...state().bolao, data_limite: "2020-01-01T00:00:00Z" },
    });
    await assert.rejects(
      updatePool(
        db,
        created.adminToken,
        { ...created, participantes: [member("a", created.bolao.id)] },
        1,
      ),
      /congelados/,
    );
  } finally {
    db.close?.();
  }
});
test("OCR ignora metadados e não inventa dezenas de datas", () => {
  assert.deepEqual(
    parseCaixaTicketText(
      "CONCURSO 2810\nDATA 19/11/2026 14:22:10\nVALOR R$ 6,00",
    ),
    [],
  );
  assert.deepEqual(
    parseCaixaTicketText(
      "01 02 03 04 05\n06 07 08 09 10\n11 12 13 14 15\nDATA 19/11/2026",
      "Lotofácil",
    )[0].dezenas,
    Array.from({ length: 15 }, (_, i) => i + 1),
  );
  assert.deepEqual(parseCaixaTicketText("01 01 02 03 04 05", "Mega-Sena"), []);
  assert.deepEqual(parseCaixaTicketText("01 02 03 04 05 99", "Mega-Sena"), []);
});
test("motor recusa duplicatas e aceita Mega com vinte dezenas", () => {
  const j = {
    id: "j",
    bolao_id: "b",
    criado_em: "now",
    dezenas: [1, 1, 1, 1, 1, 1],
  };
  assert.throws(() => conferirJogo(j, [1, 2, 3, 4, 5, 6], {}), /distintas/);
  assert.equal(
    conferirJogo(
      { ...j, dezenas: Array.from({ length: 20 }, (_, i) => i + 1) },
      [1, 2, 3, 4, 5, 6],
      { sena: 1 },
    ).premiacaoCalculada.senas,
    1,
  );
});
test("Lotofácil aplica valores vigentes para 12 e 13 acertos", () => {
  const draw = Array.from({ length: 15 }, (_, i) => i + 1);
  const jogo = (hits: number) => ({
    id: "j",
    bolao_id: "b",
    criado_em: "now",
    dezenas: [
      ...draw.slice(0, hits),
      ...Array.from({ length: 15 - hits }, (_, i) => i + 16),
    ],
  });
  assert.equal(
    conferirJogo(jogo(12), draw, {}, "Lotofácil").premiacaoCalculada.valorTotal,
    14,
  );
  assert.equal(
    conferirJogo(jogo(13), draw, {}, "Lotofácil").premiacaoCalculada.valorTotal,
    35,
  );
});
test("rateio fecha 100 reais em centavos e mantém desempate estável", () => {
  const people = ["c", "b", "a"].map((id) => member(id, "b"));
  const result = calcularRateio(people, 100);
  assert.equal(
    result.reduce((s, p) => s + Math.round(p.valorAReceber * 100), 0),
    10000,
  );
  assert.equal(result.find((p) => p.id === "a")?.valorAReceber, 33.34);
  assert.deepEqual(
    calcularRateio([...people].reverse(), 100).sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
    result.sort((a, b) => a.id.localeCompare(b.id)),
  );
});
test("Caixa: falha não gera fallback, concurso incorreto é recusado e prêmio zero é preservado", async () => {
  await assert.rejects(
    fetchOfficialDraw("Mega-Sena", 1, async () => {
      throw new Error("offline");
    }),
    /Não foi possível/,
  );
  assert.throws(
    () => parseOfficialDraw(fixture(), "Mega-Sena", 2, "https://example.org"),
    /resultado válido/,
  );
  assert.equal(
    parseOfficialDraw(fixture(), "Mega-Sena", 1, "https://example.org")
      .sorteios[0].premiacao.sena,
    0,
  );
  const malformed = fixture();
  malformed.listaDezenas = ["01", "01", "02", "03", "04", "05"];
  assert.throws(
    () => parseOfficialDraw(malformed, "Mega-Sena", 1, "https://example.org"),
    /distintas/,
  );
});
test("Dupla Sena mantém dois sorteios e rateios independentes", () => {
  const r = parseOfficialDraw(
    fixture(true),
    "Dupla Sena",
    1,
    "https://example.org",
  );
  assert.equal(r.sorteios.length, 2);
  assert.equal(r.sorteios[0].premiacao.sena, 0);
  assert.equal(r.sorteios[1].premiacao.sena, 10);
});
test("manifesto inclui regras e conteúdo de comprovantes, SHA-256 é conhecido", async () => {
  const s = state(),
    j = {
      id: "j",
      bolao_id: "new",
      criado_em: "now",
      dezenas: [1, 2, 3, 4, 5, 6],
      foto_sha256: "abc",
    };
  assert.notEqual(
    generateCanonicalManifest(s.bolao, [], [j]),
    generateCanonicalManifest(s.bolao, [], [{ ...j, foto_sha256: "def" }]),
  );
  assert.notEqual(
    generateCanonicalManifest(s.bolao, [], []),
    generateCanonicalManifest({ ...s.bolao, regras: ["outra"] }, [], []),
  );
  assert.equal(
    await calculateSha256("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
