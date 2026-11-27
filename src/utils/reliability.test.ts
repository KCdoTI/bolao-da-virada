import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sqliteStore } from "../../server/store.js";
import {
  createPool,
  executeParticipantAction,
  managePoolEvents,
  readPool,
  updatePool,
} from "../../server/poolService.js";
import { fetchOfficialDraw, parseOfficialDraw } from "../../server/caixa.js";
import {
  clearLotteryInfoCache,
  fetchLotteryLiveInfo,
  parseCaixaPortalSummary,
} from "../../server/lotteryInfo.js";
import {
  conferirJogo,
  calcularRateio,
  calcularRateioUnificado,
  obterCotasPagas,
  obterCotasPendentes,
} from "./lotteryEngine.js";
import { gerarPayloadPixEstatico, gerarQrCodePixSvg } from "./pix.js";
import {
  parseVCardContacts,
  parsePastedContactsList,
} from "./contacts.js";
import {
  extractCaixaTicketMetadata,
  parseCaixaTicketText,
} from "./lotteryOcrParser";
import {
  buildParticipantPortalUrl,
  buildWhatsAppIndividualReminderMessage,
  calculateSha256,
  generateCanonicalManifest,
} from "./transparency";
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
  const publicData: any = await readPool(db, created.bolao.hash_slug);
  // Jogos ficam ocultos no acesso não pago, mas a contagem agregada aparece no resumo
  assert.equal(publicData.jogos.length, 0);
  assert.equal(publicData.resumo.jogos, 1);
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
  assert.equal(personal.jogos.length, 1);
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
    (await readPool(db, rotated.bolao.hash_slug)).bolao.resultado,
    undefined,
  );
  assert.equal(
    (
      await readPool(
        db,
        rotated.bolao.hash_slug,
        undefined,
        updated.participantes[0].token_acesso,
      )
    ).bolao.resultado?.origem,
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

  // Caso real de bilhete térmico Bolão Caixa (5 jogos A..E com zero cortado, SU e números colados)
  const realThermalOcr = `
BOLAO CAIXA
COTA 17/17 :
A424-A40057C1855A1B6C99-8
COMBINADA G7
26N0V2626 HORA OF 17:01:02
A 19 253338 44 51 56 SU
B ©9 12 13 22 2351 52 SU
C @2 99 21 26 34 55 5g sl
0D 2 85 89 12 40 41 56 4
F O96 31 43 45 46 52 60
E. LOTERICO 21.821277-2 TERMINAL 067656
CONC. 3091 26NDV2026
VALOR DA COTA: R$ 12, 40*
  `.trim();

  const meta = extractCaixaTicketMetadata(realThermalOcr);
  assert.equal(meta.codigoBilhete, "A424-A40057C1855A1B6C99-8");
  assert.equal(meta.concurso, 3091);
  assert.equal(meta.combinadaDezenas, 7);
  assert.equal(meta.cotaBolaoCaixa, "17/17");

  const parsedGames = parseCaixaTicketText(realThermalOcr, "Mega-Sena");
  assert.equal(parsedGames.length, 5);
  assert.deepEqual(parsedGames[0].dezenas, [19, 25, 33, 38, 44, 51, 56]);
  assert.deepEqual(parsedGames[1].dezenas, [9, 12, 13, 22, 23, 51, 52]);
  assert.deepEqual(parsedGames[2].dezenas, [2, 9, 21, 26, 34, 55, 59]);
  assert.deepEqual(parsedGames[3].dezenas, [2, 5, 9, 12, 40, 41, 56]);
  assert.deepEqual(parsedGames[4].dezenas, [6, 31, 43, 45, 46, 52, 60]);
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

test("Lote A: criação com organizador cotista, edição de participante e migração de concurso vencido", async () => {
  const db = await sqliteStore(":memory:");
  try {
    const initial = state();
    initial.bolao.nome_organizador = "Kelvin";
    initial.participantes = [
      {
        id: "org-init",
        bolao_id: "new",
        nome: "Kelvin",
        telefone: "11988887777",
        qtd_cotas: 2,
        status_pagamento: "Pago",
        is_organizador: true,
      },
    ];
    const created = await createPool(db, initial);
    assert.equal(created.participantes.length, 1);
    assert.equal(created.participantes[0].is_organizador, true);
    assert.equal(created.participantes[0].qtd_cotas, 2);
    assert.ok(created.participantes[0].pago_em);
    assert.equal(created.participantes[0].bolao_id, created.bolao.id);
    const originalToken = created.participantes[0].token_acesso;

    // Edição de participante (nome, cotas, WhatsApp) preservando token_acesso
    const edited = await updatePool(
      db,
      created.adminToken,
      {
        bolao: created.bolao,
        participantes: [
          {
            ...created.participantes[0],
            nome: "Kelvin Castro",
            telefone: "11977776666",
            qtd_cotas: 3,
          },
        ],
        jogos: [],
      },
      1,
      "participante_editado",
    );
    assert.equal(edited.participantes[0].nome, "Kelvin Castro");
    assert.equal(edited.participantes[0].qtd_cotas, 3);
    assert.equal(edited.participantes[0].token_acesso, originalToken);

    // Fechar bolão e depois migrar para o próximo concurso (concurso vencido sem apuração)
    const closed = await updatePool(
      db,
      created.adminToken,
      { ...edited, bolao: { ...edited.bolao, status: "encerrado" } },
      2,
      "fechado",
    );
    assert.ok(closed.bolao.fechado_em);

    const newDeadline = new Date(Date.now() + 86400000 * 5).toISOString();
    const newDraw = new Date(Date.now() + 86400000 * 5 + 10800000).toISOString();
    const rescheduled = await updatePool(
      db,
      created.adminToken,
      {
        ...closed,
        bolao: {
          ...closed.bolao,
          concurso_numero: 2,
          data_limite: newDeadline,
          data_sorteio: newDraw,
          status: "aberto",
        },
      },
      3,
      "adiar_concurso",
    );
    assert.equal(rescheduled.bolao.concurso_numero, 2);
    assert.equal(rescheduled.bolao.status, "aberto");
    assert.equal(rescheduled.bolao.fechado_em, undefined);
    assert.ok(
      rescheduled.history.some((h) => h.action === "concurso_atualizado_1_para_2"),
    );
  } finally {
    db.close?.();
  }
});

test("Lote A: portal da Caixa gera opções de concursos futuros, Virada e fallback espelho", async () => {
  clearLotteryInfoCache();
  const parsed = parseCaixaPortalSummary(
    {
      numero: 3090,
      dataApuracao: "24/11/2026",
      listaDezenas: ["04", "12", "23", "38", "49", "58"],
      acumulado: true,
      numeroConcursoProximo: 3091,
      dataProximoConcurso: "26/11/2026",
      valorEstimadoProximoConcurso: 75000000,
      valorAcumuladoConcursoEspecial: 140000000,
    },
    "Mega-Sena",
    "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena",
    "caixa_oficial",
  );
  assert.equal(parsed.proximoConcurso.numero, 3091);
  assert.equal(parsed.proximoConcurso.dataProximoConcurso, "26/11/2026");
  assert.ok(parsed.opcoesConcursos.some((o) => o.numero === 3091 && o.tipo === "proximo_oficial"));
  assert.ok(parsed.opcoesConcursos.some((o) => o.numero === 3092 && o.tipo === "calendario_previsto"));
  assert.ok(parsed.opcoesConcursos.some((o) => o.numero === 3100 && o.tipo === "especial_oficial"));

  // Simula bloqueio no endpoint primário e sucesso no espelho
  let calls = 0;
  const fallbackInfo = await fetchLotteryLiveInfo(
    "Quina",
    async (url) => {
      calls++;
      if (String(url).includes("servicebus2.caixa.gov.br")) {
        throw new Error("blocked");
      }
      return new Response(
        JSON.stringify({
          concurso: 6590,
          data: "25/11/2026",
          dezenas: ["02", "15", "33", "61", "78"],
          acumulou: true,
          proximoConcurso: 6591,
          dataProximoConcurso: "26/11/2026",
          valorEstimadoProximoConcurso: 12000000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
    true,
  );
  assert.equal(calls, 2);
  assert.equal(fallbackInfo.fonteTipo, "contingencia_espelho");
  assert.equal(fallbackInfo.proximoConcurso.numero, 6591);
});

test("Lote B: etapas do link (aceite -> PIX QR -> já paguei -> transparência pós-confirmação), palpites, troco igualitário e fila n8n", async () => {
  // 1. Testa geração BR Code PIX + QR SVG local
  const brCode = gerarPayloadPixEstatico({
    chavePix: "(11) 98888-7777",
    tipoChave: "telefone",
    nomeRecebedor: "Kelvin Castro",
    cidadeRecebedor: "Sao Paulo",
    valor: 24.0,
    txid: "BOLAO3091",
  });
  assert.ok(brCode.startsWith("00020126"));
  assert.ok(brCode.includes("br.gov.bcb.pix"));
  assert.ok(brCode.includes("+5511988887777"));
  assert.ok(brCode.includes("540524.00"));
  assert.match(brCode, /6304[0-9A-F]{4}$/);
  const svg = await gerarQrCodePixSvg(brCode);
  assert.ok(svg.includes("<svg"));

  // 2. Testa divisão igualitária do troco vs proporcional das cotas
  const rateioMisto = calcularRateioUnificado(
    [
      { id: "p1", bolao_id: "b", nome: "Ana", telefone: "", qtd_cotas: 3, status_pagamento: "Pago" },
      { id: "p2", bolao_id: "b", nome: "Bruno", telefone: "", qtd_cotas: 1, status_pagamento: "Pago" },
      { id: "p3", bolao_id: "b", nome: "Caio", telefone: "", qtd_cotas: 2, status_pagamento: "Pendente" },
    ],
    100, // R$ 100 dos jogos normais -> Ana 75, Bruno 25
    50,  // R$ 50 dos jogos de troco -> Ana 25, Bruno 25 (igualitário!)
  );
  assert.equal(rateioMisto.find((r) => r.id === "p1")?.valorCotas, 75);
  assert.equal(rateioMisto.find((r) => r.id === "p1")?.valorTroco, 25);
  assert.equal(rateioMisto.find((r) => r.id === "p1")?.valorAReceber, 100);
  assert.equal(rateioMisto.find((r) => r.id === "p2")?.valorCotas, 25);
  assert.equal(rateioMisto.find((r) => r.id === "p2")?.valorTroco, 25);
  assert.equal(rateioMisto.find((r) => r.id === "p2")?.valorAReceber, 50);
  assert.equal(rateioMisto.find((r) => r.id === "p3")?.valorAReceber, 0);

  // 3. Fluxo completo no banco: inscrição -> aceite -> já paguei -> palpite -> bloqueio de jogos -> confirmação -> liberação + n8n ack
  const db = await sqliteStore(":memory:");
  try {
    const created = await createPool(db, state());
    const withGame = await updatePool(
      db,
      created.adminToken,
      {
        ...created,
        participantes: [
          {
            id: "convidado-1",
            bolao_id: created.bolao.id,
            nome: "Mariana",
            telefone: "11977776666",
            qtd_cotas: 2,
            status_pagamento: "Pendente",
          },
        ],
        jogos: [
          {
            id: "j-normal",
            bolao_id: created.bolao.id,
            dezenas: [1, 2, 3, 4, 5, 6],
            criado_em: new Date().toISOString(),
            tipo_jogo: "normal",
          },
          {
            id: "j-troco",
            bolao_id: created.bolao.id,
            dezenas: [7, 8, 9, 10, 11, 12],
            criado_em: new Date().toISOString(),
            tipo_jogo: "troco",
          },
        ],
      },
      1,
    );

    const tokenMariana = withGame.participantes[0].token_acesso!;

    // Antes do aceite: chave PIX oculta e jogos ocultos
    const step1: any = await readPool(
      db,
      created.bolao.hash_slug,
      undefined,
      tokenMariana,
    );
    assert.equal(step1.bolao.chave_pix_organizador, "");
    assert.equal(step1.jogos.length, 0);
    assert.equal(step1.transparenciaLiberada, false);

    // Aceita regras -> libera PIX, mas jogos continuam bloqueados até confirmação de pagamento!
    const step2: any = await executeParticipantAction(db, {
      slug: created.bolao.hash_slug,
      personalToken: tokenMariana,
      action: "aceitar_regras",
    });
    assert.equal(step2.bolao.chave_pix_organizador, "privado");
    assert.equal(step2.jogos.length, 0);
    assert.equal(step2.transparenciaLiberada, false);

    // Informa pagamento PIX e envia palpite
    const afterPaidNotice: any = await executeParticipantAction(db, {
      slug: created.bolao.hash_slug,
      personalToken: tokenMariana,
      action: "informar_pagamento",
    });
    assert.ok(afterPaidNotice.participantes[0].avisou_pagamento_em);

    const afterPalpite: any = await executeParticipantAction(db, {
      slug: created.bolao.hash_slug,
      personalToken: tokenMariana,
      action: "enviar_palpite",
      payload: { dezenas: [5, 10, 15, 20, 25, 30, 40, 50, 60] }, // 9 dezenas (não trava em 6!)
    });
    assert.equal(afterPalpite.palpites.length, 1);
    assert.equal(afterPalpite.palpites[0].dezenas.length, 9);

    // Também aceita sugestão curta de dezenas favoritas (ex.: 2 números da sorte)
    const afterShortPalpite: any = await executeParticipantAction(db, {
      slug: created.bolao.hash_slug,
      personalToken: tokenMariana,
      action: "enviar_palpite",
      payload: { dezenas: [7, 13] },
    });
    assert.equal(afterShortPalpite.palpites.length, 2);

    // n8n consulta fila de eventos não lidos
    const feed1 = await managePoolEvents(db, created.adminToken, {
      onlyUnacked: true,
    });
    assert.equal(feed1.eventos.length, 4); // regras_aceitas, pagamento_informado, 2x novo_palpite
    assert.equal(feed1.resumo.aguardando_confirmacao_pix, 1);

    // n8n confirma leitura até o último seq -> fila não lida zera
    const feedAck = await managePoolEvents(db, created.adminToken, {
      ackUpTo: feed1.resumo.ultimo_seq,
      onlyUnacked: true,
    });
    assert.equal(feedAck.eventos.length, 0);

    // Organizador recarrega estado atualizado e confirma o pagamento de Mariana
    const adminCurrent: any = await readPool(db, "", created.adminToken);
    await updatePool(
      db,
      created.adminToken,
      {
        bolao: adminCurrent.bolao,
        jogos: adminCurrent.jogos,
        participantes: adminCurrent.participantes.map((p: any) => ({
          ...p,
          status_pagamento: "Pago",
        })),
      },
      adminCurrent.revision,
    );

    // Etapa 3: agora Mariana vê os jogos normais e os jogos de troco!
    const step3: any = await readPool(
      db,
      created.bolao.hash_slug,
      undefined,
      tokenMariana,
    );
    assert.equal(step3.transparenciaLiberada, true);
    assert.equal(step3.jogos.length, 2);
    assert.equal(
      step3.jogos.filter((j: any) => j.tipo_jogo === "troco").length,
      1,
    );
  } finally {
    db.close?.();
  }
});

test("Lote C: parser vCard (.vcf com Quoted-Printable UTF-8 e múltiplos contatos) e lista colada", () => {
  const vcfSample = [
    "BEGIN:VCARD",
    "VERSION:2.1",
    "N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Silva;=C3=81lvaro;;;",
    "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=C3=81lvaro=20Silva",
    "TEL;WORK:+551133334444",
    "TEL;CELL;PREF:+55 11 98765-4321",
    "END:VCARD",
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Beatriz Costa",
    "TEL;TYPE=IPHONE,CELL,VOICE:21999887766",
    "END:VCARD",
  ].join("\r\n");

  const parsedVcf = parseVCardContacts(vcfSample);
  assert.equal(parsedVcf.length, 2);
  assert.equal(parsedVcf[0].nome, "Álvaro Silva");
  assert.equal(parsedVcf[0].telefone, "(11) 98765-4321");
  assert.equal(parsedVcf[0].cotasSugeridas, 1);
  assert.equal(parsedVcf[1].nome, "Beatriz Costa");
  assert.equal(parsedVcf[1].telefone, "(21) 99988-7766");

  const pasted = parsePastedContactsList(
    "Mariana Souza - 11988887777 - 3 cotas\nCarlos Lima; (31) 97777-6666; 2\nFernanda +55 41 96666-5555",
  );
  assert.equal(pasted.length, 3);
  assert.equal(pasted[0].nome, "Mariana Souza");
  assert.equal(pasted[0].telefone, "(11) 98888-7777");
  assert.equal(pasted[0].cotasSugeridas, 3);
  assert.equal(pasted[1].cotasSugeridas, 2);
  assert.equal(pasted[2].nome, "Fernanda");
  assert.equal(pasted[2].telefone, "(41) 96666-5555");

  // Cobrança individual SEMPRE usa o link exclusivo #cota-<slug>.<token_acesso> (e nunca #b-<slug>)
  const s = state();
  s.bolao.hash_slug = "slugPublico123";
  const eveline: Participante = {
    id: "p-ev",
    bolao_id: s.bolao.id,
    nome: "Eveline",
    telefone: "+55 11 97538-8246",
    qtd_cotas: 1,
    status_pagamento: "Pendente",
    token_acesso: "tokenExclusivoEveline999",
  };
  const personalUrl = buildParticipantPortalUrl(
    "https://bolao-da-virada-hazel.vercel.app",
    s.bolao,
    eveline,
  );
  assert.equal(
    personalUrl,
    "https://bolao-da-virada-hazel.vercel.app/#cota-slugPublico123.tokenExclusivoEveline999",
  );
  const msg = buildWhatsAppIndividualReminderMessage(
    eveline,
    s.bolao,
    personalUrl,
  );
  assert.match(msg, /#cota-slugPublico123\.tokenExclusivoEveline999/);
  assert.doesNotMatch(msg, /#b-slugPublico123/);
});

test("Lote C: jogos de troco em outra categoria (Quina dentro da Mega-Sena) validam modalidade própria, apuram resultado extra e dividem prêmio igualmente", async () => {
  const db = await sqliteStore(":memory:");
  try {
    const initial = state();
    initial.bolao.modalidade = "Mega-Sena";
    initial.bolao.concurso_numero = 3091;
    initial.participantes = [
      {
        id: "p1",
        bolao_id: "new",
        nome: "Kelvin",
        telefone: "11999990001",
        qtd_cotas: 3,
        status_pagamento: "Pago",
        is_organizador: true,
      },
      {
        id: "p2",
        bolao_id: "new",
        nome: "Amigo",
        telefone: "11999990002",
        qtd_cotas: 1,
        status_pagamento: "Pago",
      },
    ];

    const created = await createPool(db, initial);

    // Jogo normal não pode usar modalidade diferente da do bolão principal
    await assert.rejects(
      updatePool(
        db,
        created.adminToken,
        {
          bolao: created.bolao,
          participantes: created.participantes,
          jogos: [
            {
              id: "j-invalido",
              bolao_id: created.bolao.id,
              dezenas: [10, 20, 30, 40, 75],
              criado_em: new Date().toISOString(),
              tipo_jogo: "normal",
              modalidade_especifica: "Quina",
              concurso_especifico: 6591,
            },
          ],
        },
        1,
      ),
      /Apenas jogos marcados como "troco"/,
    );

    // Jogo normal da Mega (6 dezenas <= 60) + Jogo de troco na Quina (5 dezenas até 80, concurso 6591)
    const withGames = await updatePool(
      db,
      created.adminToken,
      {
        bolao: created.bolao,
        participantes: created.participantes,
        jogos: [
          {
            id: "j-mega",
            bolao_id: created.bolao.id,
            dezenas: [1, 2, 3, 4, 5, 6],
            criado_em: "2026-11-26T10:00:00.000Z",
            tipo_jogo: "normal",
          },
          {
            id: "j-troco-quina",
            bolao_id: created.bolao.id,
            dezenas: [12, 24, 36, 48, 78],
            criado_em: "2026-11-26T10:05:00.000Z",
            tipo_jogo: "troco",
            modalidade_especifica: "Quina",
            concurso_especifico: 6591,
            observacao: "Troco de R$ 2,50 na Quina",
          },
        ],
      },
      1,
    );
    assert.equal(withGames.jogos.length, 2);

    // Manifesto canônico SHA-256 diferencia modalidade/concurso do jogo de troco
    const manifestA = generateCanonicalManifest(
      withGames.bolao,
      withGames.participantes,
      withGames.jogos,
    );
    const manifestB = generateCanonicalManifest(
      withGames.bolao,
      withGames.participantes,
      withGames.jogos.map((j) =>
        j.id === "j-troco-quina" ? { ...j, concurso_especifico: 6592 } : j,
      ),
    );
    assert.notEqual(manifestA, manifestB);

    // Fecha o bolão para apurar
    const closed = await updatePool(
      db,
      created.adminToken,
      {
        ...withGames,
        bolao: {
          ...withGames.bolao,
          status: "encerrado",
          fechado_em: "2026-11-26T19:00:00.000Z",
        },
      },
      2,
    );

    // Bloqueia tentativa de forjar resultado extra como "caixa_oficial" sem passar pelo servidor
    const forgedExtra = {
      modalidade: "Quina",
      concurso: 6591,
      dataApuracao: "26/11/2026",
      origem: "caixa_oficial" as const,
      consultado_em: "2026-11-26T21:00:00.000Z",
      sorteios: [
        {
          dezenas: [12, 24, 36, 48, 78],
          premiacao: { quina: 200, quadra: 0, terno: 0, duque: 0 },
        },
      ],
    };
    await assert.rejects(
      updatePool(
        db,
        created.adminToken,
        {
          ...closed,
          bolao: { ...closed.bolao, resultados_extras: [forgedExtra] },
        },
        3,
      ),
      /Importe o resultado extra diretamente da Caixa/,
    );

    // Apura Mega-Sena (R$ 400 -> 3/4 Kelvin = R$ 300, 1/4 Amigo = R$ 100)
    // e Quina de troco (R$ 200 -> divisão igualitária por pessoa paga = R$ 100 cada)
    const settled = await updatePool(
      db,
      created.adminToken,
      {
        ...closed,
        bolao: {
          ...closed.bolao,
          status: "sorteado",
          resultado: {
            modalidade: "Mega-Sena",
            concurso: 3091,
            dataApuracao: "26/11/2026",
            origem: "manual",
            consultado_em: "2026-11-26T21:00:00.000Z",
            sorteios: [
              {
                dezenas: [1, 2, 3, 4, 5, 6],
                premiacao: { sena: 400, quina: 0, quadra: 0 },
              },
            ],
          },
          resultados_extras: [
            {
              ...forgedExtra,
              origem: "manual",
            },
          ],
        },
      },
      3,
      "resultado_extra_manual",
    );

    // Confere leitura pessoal de Kelvin (3 cotas -> R$ 300 cotas + R$ 100 troco = R$ 400)
    // e do Amigo (1 cota -> R$ 100 cotas + R$ 100 troco = R$ 200)
    const personalKelvin: any = await readPool(
      db,
      settled.bolao.hash_slug,
      undefined,
      settled.participantes[0].token_acesso,
    );
    const personalAmigo: any = await readPool(
      db,
      settled.bolao.hash_slug,
      undefined,
      settled.participantes[1].token_acesso,
    );

    assert.equal(personalKelvin.premioNormais, 400);
    assert.equal(personalKelvin.premioTroco, 200);
    assert.equal(personalKelvin.totalPremio, 600);
    assert.equal(personalKelvin.rateioPessoalCotas, 300);
    assert.equal(personalKelvin.rateioPessoalTroco, 100);
    assert.equal(personalKelvin.rateioPessoal, 400);

    assert.equal(personalAmigo.rateioPessoalCotas, 100);
    assert.equal(personalAmigo.rateioPessoalTroco, 100);
    assert.equal(personalAmigo.rateioPessoal, 200);
    assert.equal(personalAmigo.bolao.resultados_extras.length, 1);
    assert.equal(personalAmigo.bolao.resultados_extras[0].modalidade, "Quina");
  } finally {
    db.close?.();
  }
});

test("Aumentar cotas de participante já pago cobra somente a diferença (+1 cota) e preserva o que já foi quitado", async () => {
  const db = await sqliteStore(":memory:");
  try {
    const initial = state();
    initial.bolao.valor_cota = 12;
    initial.bolao.chave_pix_organizador = "371.460.128-75";
    initial.participantes = [
      {
        id: "p-ev",
        bolao_id: "new",
        nome: "Eveline",
        telefone: "11975388246",
        qtd_cotas: 1,
        status_pagamento: "Pago",
      },
    ];

    const created = await createPool(db, initial);
    const evInicial = created.participantes[0];
    assert.equal(obterCotasPagas(evInicial), 1);
    assert.equal(obterCotasPendentes(evInicial), 0);

    // Organizador aumenta Eveline de 1 cota para 2 cotas (mantendo 1 cota já paga!)
    const afterIncrease = await updatePool(
      db,
      created.adminToken,
      {
        bolao: created.bolao,
        jogos: [],
        participantes: [
          {
            ...evInicial,
            qtd_cotas: 2,
            cotas_pagas: 1,
            status_pagamento: "Pendente",
          },
        ],
      },
      1,
      "participante_editado",
    );

    const evEditada = afterIncrease.participantes[0];
    assert.equal(evEditada.qtd_cotas, 2);
    assert.equal(evEditada.cotas_pagas, 1);
    assert.equal(evEditada.status_pagamento, "Pendente");
    assert.equal(obterCotasPagas(evEditada), 1);
    assert.equal(obterCotasPendentes(evEditada), 1);

    // No link individual, o resumo mantém 1 cota paga e a mensagem de WhatsApp cobra R$ 12,00 (e NÃO R$ 24,00!)
    const personalView: any = await readPool(
      db,
      afterIncrease.bolao.hash_slug,
      undefined,
      evEditada.token_acesso,
    );
    assert.equal(personalView.resumo.cotas, 2);
    assert.equal(personalView.resumo.cotas_pagas, 1);
    assert.equal(personalView.transparenciaLiberada, true);

    const linkEv = buildParticipantPortalUrl(
      "https://bolao-da-virada-hazel.vercel.app",
      afterIncrease.bolao,
      evEditada,
    );
    const msgCobranca = buildWhatsAppIndividualReminderMessage(
      evEditada,
      afterIncrease.bolao,
      linkEv,
    );
    assert.match(msgCobranca, /\+1 cota nova\): R\$ 12\.00/);
    assert.match(msgCobranca, /Já confirmado como pago: 1 cota \(R\$ 12\.00\)/);

    // Participante clica em "Já fiz o PIX" da diferença -> evento alerta exatamente +1 cota (R$ 12.00)
    await executeParticipantAction(db, {
      slug: afterIncrease.bolao.hash_slug,
      personalToken: evEditada.token_acesso,
      action: "informar_pagamento",
    });
    const evts = await managePoolEvents(db, created.adminToken, {
      onlyUnacked: true,
    });
    assert.match(evts.eventos[0].mensagem_whatsapp, /\*\+1 cota\(s\)\* — \*R\$ 12\.00\*/);

    // Organizador confirma o pagamento complementar -> passa para 2/2 cotas pagas
    const currentAdmin: any = await readPool(db, "", created.adminToken);
    const fullyPaid = await updatePool(
      db,
      created.adminToken,
      {
        bolao: currentAdmin.bolao,
        jogos: currentAdmin.jogos,
        participantes: currentAdmin.participantes.map((p: any) => ({
          ...p,
          status_pagamento: "Pago",
          cotas_pagas: p.qtd_cotas,
        })),
      },
      currentAdmin.revision,
    );
    assert.equal(fullyPaid.participantes[0].status_pagamento, "Pago");
    assert.equal(obterCotasPagas(fullyPaid.participantes[0]), 2);
    assert.equal(obterCotasPendentes(fullyPaid.participantes[0]), 0);

    // Check "Cota entregue": bloqueia se estiver Pendente e libera quando Pago (inclusive após fechamento)
    const revBefore = fullyPaid.revision;
    const withPendente = await updatePool(
      db,
      created.adminToken,
      {
        bolao: fullyPaid.bolao,
        jogos: fullyPaid.jogos,
        participantes: [
          ...fullyPaid.participantes,
          {
            id: "p-pend",
            bolao_id: fullyPaid.bolao.id,
            nome: "Pendente Teste",
            telefone: "11911112222",
            qtd_cotas: 1,
            status_pagamento: "Pendente",
          },
        ],
      },
      revBefore,
    );

    await assert.rejects(
      updatePool(
        db,
        created.adminToken,
        {
          bolao: withPendente.bolao,
          jogos: withPendente.jogos,
          participantes: withPendente.participantes.map((p) =>
            p.id === "p-pend" ? { ...p, cota_entregue: true } : p,
          ),
        },
        withPendente.revision,
        "cota_entregue_atualizada",
      ),
      /Confirme o pagamento completo/,
    );

    const markedDelivered = await updatePool(
      db,
      created.adminToken,
      {
        bolao: withPendente.bolao,
        jogos: withPendente.jogos,
        participantes: withPendente.participantes.map((p) =>
          p.id === "p-ev" ? { ...p, cota_entregue: true } : p,
        ),
      },
      withPendente.revision,
      "cota_entregue_atualizada",
    );

    const evDelivered = markedDelivered.participantes.find((p) => p.id === "p-ev")!;
    assert.equal(evDelivered.cota_entregue, true);
    assert.ok(evDelivered.cota_entregue_em);

    // Visível no link individual do próprio cotista
    const personalDelivered: any = await readPool(
      db,
      markedDelivered.bolao.hash_slug,
      undefined,
      evDelivered.token_acesso,
    );
    assert.equal(personalDelivered.participantes[0].cota_entregue, true);
    assert.ok(personalDelivered.participantes[0].cota_entregue_em);

    // Regressão real: mesmo com jogo com comprovante (foto_sha256), prazo vencido, fechado_em e resultado oficial da Caixa,
    // clicar em "Cota entregue" (e desmarcar) deve confirmar sem falso conflito 409!
    await db.putReceipt(
      "a".repeat(64),
      markedDelivered.bolao.id,
      "data:image/jpeg;base64,/9j/4AAQ",
    );
    const withReceiptGame = await updatePool(
      db,
      created.adminToken,
      {
        bolao: markedDelivered.bolao,
        participantes: markedDelivered.participantes.map((p) =>
          p.id === "p-ev"
            ? { ...p, cota_entregue: false, cota_entregue_em: undefined }
            : p,
        ),
        jogos: [
          {
            id: "j-foto",
            bolao_id: markedDelivered.bolao.id,
            dezenas: [1, 2, 3, 4, 5, 6],
            foto_url: "receipt:" + "a".repeat(64),
            criado_em: "2026-11-26T22:00:00.000Z",
          },
        ],
      },
      markedDelivered.revision,
    );

    // Apura como resultado oficial da Caixa e fecha o bolão
    const officialSettled = await updatePool(
      db,
      created.adminToken,
      {
        ...withReceiptGame,
        bolao: {
          ...withReceiptGame.bolao,
          status: "sorteado",
          fechado_em: "2026-11-26T23:00:00.000Z",
          data_limite: "2020-01-01T00:00:00.000Z",
          resultado: parseOfficialDraw(
            fixture(),
            "Mega-Sena",
            withReceiptGame.bolao.concurso_numero,
            "https://servicebus2.caixa.gov.br/test",
          ),
        },
      },
      withReceiptGame.revision,
      "importar_caixa",
      true,
    );

    // Simula o cliente reenviando state onde foto_sha256 vem reordenado pelo schema
    const afterClickDelivered = await updatePool(
      db,
      created.adminToken,
      {
        bolao: officialSettled.bolao,
        jogos: officialSettled.jogos.map(({ foto_sha256, ...rest }) => ({
          ...rest,
          foto_sha256,
        })),
        participantes: officialSettled.participantes.map((p) =>
          p.id === "p-ev"
            ? {
                ...p,
                cota_entregue: true,
                cota_entregue_em: new Date().toISOString(),
              }
            : p,
        ),
      },
      officialSettled.revision,
      "cota_entregue_atualizada",
    );
    assert.equal(
      afterClickDelivered.participantes.find((p) => p.id === "p-ev")
        ?.cota_entregue,
      true,
    );
  } finally {
    db.close?.();
  }
});
