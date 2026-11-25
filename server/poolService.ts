import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolStore, StoredPool } from "./store.js";
import type {
  Bolao,
  NotificacaoEvento,
  PalpiteParticipante,
  PoolState,
} from "../src/types/index.js";
import {
  CATALOGO_MODALIDADES,
  getModalidadeInfo,
} from "../src/constants/lotteryCatalog.js";
import { validarDezenas } from "../src/utils/validation.js";
import {
  conferirJogo,
  calcularRateioUnificado,
} from "../src/utils/lotteryEngine.js";

const text = z.string().max(200);
const date = z.string().datetime({ offset: true });
const prizes = z.record(z.string(), z.number().finite().min(0).max(1e12));

const palpiteSchema = z.object({
  id: text,
  participante_id: text,
  participante_nome: text.min(1),
  dezenas: z.array(z.number()),
  criado_em: text,
});

const eventoSchema = z.object({
  seq: z.number().int().min(1),
  tipo: z.enum([
    "nova_inscricao",
    "regras_aceitas",
    "pagamento_informado",
    "novo_palpite",
    "resultado_publicado",
  ]),
  criado_em: date,
  titulo: z.string().max(240),
  mensagem_whatsapp: z.string().max(2000),
  participante_id: text.optional(),
  participante_nome: text.optional(),
  lido: z.boolean().optional(),
});

const schema = z.object({
  bolao: z.object({
    id: text,
    nome: text.min(1),
    modalidade: z
      .string()
      .refine((v) => Object.hasOwn(CATALOGO_MODALIDADES, v)),
    concurso_numero: z.number().int().min(1),
    valor_cota: z.number().finite().positive().max(1e6),
    data_limite: date,
    data_sorteio: date.optional(),
    chave_pix_organizador: text,
    nome_organizador: text.optional(),
    tipo_chave_pix: z
      .enum(["cpf", "cnpj", "email", "telefone", "aleatoria"])
      .optional(),
    regra_downgrade: z
      .enum(["cortar_satelites", "diminuir_dezenas", "devolver_excedente"])
      .optional(),
    horario_limite_loterica: text.optional(),
    cidade_loterica: text.optional(),
    status: z.enum(["aberto", "encerrado", "sorteado"]),
    hash_slug: text,
    regras: z.array(z.string().max(1000)).max(30).optional(),
    fechado_em: date.optional(),
    permitir_inscricao_publica: z.boolean().optional(),
    resultado: z
      .object({
        modalidade: text,
        concurso: z.number().int(),
        origem: z.enum(["manual", "caixa_oficial"]),
        fonte: z.string().url().optional(),
        consultado_em: date,
        dataApuracao: text.min(1),
        sorteios: z
          .array(z.object({ dezenas: z.array(z.number()), premiacao: prizes }))
          .min(1)
          .max(2),
      })
      .optional(),
  }),
  participantes: z
    .array(
      z.object({
        id: text,
        bolao_id: text,
        nome: text.min(1),
        telefone: text,
        qtd_cotas: z.number().int().min(1).max(1000000),
        status_pagamento: z.enum(["Pago", "Pendente"]),
        data_registro: text.optional(),
        token_acesso: text.optional(),
        pago_em: date.optional(),
        is_organizador: z.boolean().optional(),
        aceite_em: date.optional(),
        regras_aceitas_hash: text.optional(),
        avisou_pagamento_em: date.optional(),
      }),
    )
    .max(500),
  jogos: z
    .array(
      z.object({
        id: text,
        bolao_id: text,
        dezenas: z.array(z.number()),
        foto_url: z
          .string()
          .regex(/^receipt:[a-f0-9]{64}$/)
          .optional(),
        foto_sha256: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
        criado_em: text,
        codigo_bilhete: text.optional(),
        tipo_jogo: z.enum(["normal", "troco"]).optional(),
        observacao: z.string().max(240).optional(),
      }),
    )
    .max(200),
  palpites: z.array(palpiteSchema).max(500).optional(),
  eventos: z.array(eventoSchema).max(300).optional(),
});

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const token = () => randomBytes(32).toString("base64url");

export function computeRulesHash(bolao: Bolao): string {
  return hashToken(
    JSON.stringify({
      modalidade: bolao.modalidade,
      concurso: bolao.concurso_numero,
      valor_cota: bolao.valor_cota,
      regras: bolao.regras || [],
    }),
  ).slice(0, 16);
}

function appendEvent(
  existing: NotificacaoEvento[] | undefined,
  event: Omit<NotificacaoEvento, "seq" | "criado_em">,
  now: string,
): NotificacaoEvento[] {
  const list = existing || [];
  const nextSeq = list.length > 0 ? list[list.length - 1].seq + 1 : 1;
  const updated = [...list, { ...event, seq: nextSeq, criado_em: now }];
  return updated.slice(-200);
}

export function validateState(raw: unknown): PoolState {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new HttpError(
      400,
      `Dados inválidos: ${parsed.error.issues[0].path.join(".")}.`,
    );
  const s = parsed.data as PoolState;
  for (const j of s.jogos) validarDezenas(j.dezenas, s.bolao.modalidade);
  if (s.palpites) {
    for (const p of s.palpites) validarDezenas(p.dezenas, s.bolao.modalidade);
  }
  for (const list of [s.jogos, s.participantes]) {
    if (
      list.some((x) => x.bolao_id !== s.bolao.id) ||
      new Set(list.map((x) => x.id)).size !== list.length
    )
      throw new HttpError(
        400,
        "Registros duplicados ou pertencentes a outro bolão.",
      );
  }
  const r = s.bolao.resultado;
  if (r) {
    if (
      r.modalidade !== s.bolao.modalidade ||
      r.concurso !== s.bolao.concurso_numero ||
      r.sorteios.length !==
        (getModalidadeInfo(r.modalidade).modalidadeBase === "Dupla Sena"
          ? 2
          : 1)
    )
      throw new HttpError(400, "Resultado incompatível com o concurso.");
    for (const draw of r.sorteios)
      validarDezenas(draw.dezenas, r.modalidade, true);
  }
  if (
    s.bolao.data_sorteio &&
    new Date(s.bolao.data_limite) >= new Date(s.bolao.data_sorteio)
  )
    throw new HttpError(400, "O prazo de pagamento deve anteceder o sorteio.");
  return s;
}

export function calculatePoolPrizes(s: PoolState) {
  if (!s.bolao.resultado) {
    return { premioNormais: 0, premioTroco: 0, totalPremio: 0 };
  }
  let premioNormais = 0;
  let premioTroco = 0;
  for (const j of s.jogos) {
    const ganhoJogo = s.bolao.resultado.sorteios.reduce(
      (n, draw) =>
        n +
        conferirJogo(j, draw.dezenas, draw.premiacao, s.bolao.modalidade)
          .premiacaoCalculada.valorTotal,
      0,
    );
    if (j.tipo_jogo === "troco") {
      premioTroco += ganhoJogo;
    } else {
      premioNormais += ganhoJogo;
    }
  }
  return {
    premioNormais,
    premioTroco,
    totalPremio: premioNormais + premioTroco,
  };
}

export function publicProjection(s: PoolState, personalToken?: string) {
  const own = personalToken
    ? s.participantes.find((p) => p.token_acesso === personalToken)
    : undefined;
  if (personalToken && !own)
    throw new HttpError(404, "Link pessoal não encontrado.");

  const regrasHash = computeRulesHash(s.bolao);
  const isPaid = Boolean(own && own.status_pagamento === "Pago");
  const hasAccepted = Boolean(
    own &&
      own.aceite_em &&
      (!own.regras_aceitas_hash || own.regras_aceitas_hash === regrasHash),
  );

  // Regra definida pelo organizador: transparência completa (jogos, comprovantes/hashes, apuração e rateio)
  // só é liberada depois que o pagamento do participante é confirmado pelo organizador ("Pago").
  const transparenciaLiberada = isPaid;
  const pixLiberado = Boolean(own && (hasAccepted || isPaid));

  const { chave_pix_organizador, resultado, ...bolaoPublico } = s.bolao;
  const { premioNormais, premioTroco, totalPremio } = calculatePoolPrizes(s);

  const meuRateio =
    transparenciaLiberada && own
      ? calcularRateioUnificado(
          s.participantes,
          premioNormais,
          premioTroco,
        ).find((p) => p.id === own.id)
      : undefined;

  const jogosNormaisCount = s.jogos.filter((j) => j.tipo_jogo !== "troco").length;
  const jogosTrocoCount = s.jogos.filter((j) => j.tipo_jogo === "troco").length;

  return {
    regrasHash,
    transparenciaLiberada,
    totalPremio: transparenciaLiberada ? totalPremio : undefined,
    premioNormais: transparenciaLiberada ? premioNormais : undefined,
    premioTroco: transparenciaLiberada ? premioTroco : undefined,
    rateioPessoal: transparenciaLiberada ? meuRateio?.valorAReceber : undefined,
    rateioPessoalCotas: transparenciaLiberada ? meuRateio?.valorCotas : undefined,
    rateioPessoalTroco: transparenciaLiberada ? meuRateio?.valorTroco : undefined,
    bolao: {
      ...bolaoPublico,
      resultado: transparenciaLiberada ? resultado : undefined,
      chave_pix_organizador: pixLiberado ? chave_pix_organizador : "",
    },
    jogos: transparenciaLiberada
      ? s.jogos.map(({ id, dezenas, criado_em, tipo_jogo, observacao, foto_sha256, codigo_bilhete }) => ({
          id,
          bolao_id: bolaoPublico.id,
          dezenas,
          criado_em,
          tipo_jogo: tipo_jogo || "normal",
          observacao,
          foto_sha256,
          codigo_bilhete,
        }))
      : [],
    palpites:
      own && (hasAccepted || isPaid)
        ? (s.palpites || []).map((p) => ({
            ...p,
            is_meu: p.participante_id === own.id,
          }))
        : [],
    participantes: own
      ? [{ ...own, telefone: "", token_acesso: undefined }]
      : [],
    resumo: {
      participantes: s.participantes.length,
      cotas: s.participantes.reduce((n, p) => n + p.qtd_cotas, 0),
      cotas_pagas: s.participantes
        .filter((p) => p.status_pagamento === "Pago")
        .reduce((n, p) => n + p.qtd_cotas, 0),
      jogos: s.jogos.length,
      jogos_normais: jogosNormaisCount,
      jogos_troco: jogosTrocoCount,
      palpites: (s.palpites || []).length,
    },
  };
}

export async function createPool(store: PoolStore, input: unknown) {
  const state = validateState(input);
  const adminToken = token();
  const id = randomUUID();
  const now = new Date().toISOString();
  const regrasHash = computeRulesHash(state.bolao);

  state.bolao = {
    ...state.bolao,
    id,
    hash_slug: token(),
    status: "aberto",
    fechado_em: undefined,
    resultado: undefined,
    permitir_inscricao_publica: state.bolao.permitir_inscricao_publica ?? true,
  };
  state.participantes = state.participantes.slice(0, 10).map((p) => ({
    ...p,
    id: randomUUID(),
    bolao_id: id,
    token_acesso: token(),
    data_registro: now,
    aceite_em: p.is_organizador ? now : p.aceite_em,
    regras_aceitas_hash: p.is_organizador ? regrasHash : p.regras_aceitas_hash,
    pago_em: p.status_pagamento === "Pago" ? now : undefined,
  }));
  state.jogos = [];
  state.palpites = [];
  state.eventos = [];

  const row: StoredPool = {
    id,
    slug: state.bolao.hash_slug,
    admin: hashToken(adminToken),
    revision: 1,
    payload: state,
    history: [],
  };
  row.history.push({
    at: now,
    action: "criado",
    digest: hashToken(JSON.stringify(state)),
  });
  await store.create(row);
  return { ...state, revision: 1, adminToken };
}

export async function readPool(
  store: PoolStore,
  slug: string,
  credential?: string,
  personalToken?: string,
) {
  const row = await store.get(
    credential ? hashToken(credential) : slug,
    !!credential,
  );
  if (!row)
    throw new HttpError(404, "Bolão não encontrado ou acesso inválido.");
  return credential
    ? {
        ...row.payload,
        palpites: row.payload.palpites || [],
        eventos: row.payload.eventos || [],
        revision: row.revision,
        history: row.history,
      }
    : {
        ...publicProjection(row.payload, personalToken),
        revision: row.revision,
      };
}

export async function updatePool(
  store: PoolStore,
  credential: string,
  input: unknown,
  revision: number,
  action = "atualizado",
  trustedResult = false,
) {
  if (!credential)
    throw new HttpError(401, "Acesso do organizador necessário.");
  const row = await store.get(hashToken(credential), true);
  if (!row) throw new HttpError(403, "Acesso do organizador inválido.");
  if (row.revision !== revision)
    throw new HttpError(
      409,
      "Outra sessão alterou este bolão. Recarregue antes de repetir a alteração.",
    );
  const next = validateState(input);
  const old = row.payload;
  if (next.bolao.id !== old.bolao.id)
    throw new HttpError(
      400,
      "Não é possível substituir a identidade do bolão.",
    );
  next.bolao.hash_slug =
    action === "revogar_link" ? token() : old.bolao.hash_slug;
  if (
    !trustedResult &&
    JSON.stringify(next.bolao.resultado) !==
      JSON.stringify(old.bolao.resultado) &&
    next.bolao.resultado?.origem === "caixa_oficial"
  )
    throw new HttpError(400, "Importe o resultado diretamente da Caixa.");
  const financial = (s: PoolState) =>
    JSON.stringify({
      participantes: s.participantes.map((p) => ({
        id: p.id,
        nome: p.nome,
        qtd_cotas: p.qtd_cotas,
        status_pagamento: p.status_pagamento,
      })),
      jogos: s.jogos,
      modalidade: s.bolao.modalidade,
      concurso: s.bolao.concurso_numero,
      cota: s.bolao.valor_cota,
      prazo: s.bolao.data_limite,
      regras: s.bolao.regras,
    });
  const isReschedule = action === "adiar_concurso";
  if (isReschedule) {
    if (old.bolao.resultado)
      throw new HttpError(409, "Concurso já apurado não pode ser alterado.");
    if (Date.parse(next.bolao.data_limite) <= Date.now())
      throw new HttpError(
        400,
        "Defina um novo prazo futuro para o próximo concurso.",
      );
    if (
      next.bolao.concurso_numero === old.bolao.concurso_numero &&
      next.bolao.modalidade === old.bolao.modalidade &&
      next.bolao.data_limite === old.bolao.data_limite
    ) {
      throw new HttpError(400, "Selecione o novo concurso ou um novo prazo.");
    }
  }
  const expired = Date.now() >= Date.parse(old.bolao.data_limite);
  if (
    !isReschedule &&
    (old.bolao.fechado_em || expired) &&
    financial(next) !== financial(old)
  )
    throw new HttpError(
      409,
      "Prazo encerrado: participantes, pagamentos, regras e jogos estão congelados.",
    );
  if (!isReschedule && old.bolao.fechado_em && next.bolao.status === "aberto")
    throw new HttpError(409, "Um bolão fechado não pode ser reaberto.");
  if (next.bolao.resultado && !old.bolao.fechado_em && !expired)
    throw new HttpError(409, "Feche as participações antes de apurar.");

  for (const game of next.jogos) {
    game.tipo_jogo = game.tipo_jogo || "normal";
    if (game.foto_url) {
      const receipt = await store.getReceipt(game.foto_url.slice(8), row.id);
      if (!receipt)
        throw new HttpError(400, "Comprovante não encontrado neste bolão.");
      game.foto_sha256 = hashToken(receipt);
    } else game.foto_sha256 = undefined;
  }

  const now = new Date().toISOString();
  next.participantes = next.participantes.map((p) => {
    const previous = old.participantes.find((x) => x.id === p.id);
    return {
      ...p,
      token_acesso: previous?.token_acesso || token(),
      aceite_em: p.aceite_em || previous?.aceite_em,
      regras_aceitas_hash:
        p.regras_aceitas_hash || previous?.regras_aceitas_hash,
      avisou_pagamento_em:
        p.status_pagamento === "Pago"
          ? previous?.avisou_pagamento_em
          : p.avisou_pagamento_em || previous?.avisou_pagamento_em,
      pago_em:
        p.status_pagamento === "Pago"
          ? previous?.status_pagamento === "Pago"
            ? previous.pago_em
            : now
          : undefined,
    };
  });

  // Preserva palpites e fila de eventos do servidor
  next.palpites = next.palpites ?? old.palpites ?? [];
  let eventos = old.eventos || [];
  if (
    next.bolao.resultado &&
    JSON.stringify(next.bolao.resultado) !== JSON.stringify(old.bolao.resultado)
  ) {
    const { totalPremio } = calculatePoolPrizes(next);
    eventos = appendEvent(
      eventos,
      {
        tipo: "resultado_publicado",
        titulo: `Resultado do concurso #${next.bolao.concurso_numero} registrado`,
        mensagem_whatsapp: `🎯 *[${next.bolao.nome}]* Resultado do concurso #${next.bolao.concurso_numero} (${next.bolao.modalidade}) registrado! Prêmio total apurado: R$ ${totalPremio.toFixed(2)}.`,
      },
      now,
    );
  }
  next.eventos = eventos;

  next.bolao.fechado_em = isReschedule
    ? undefined
    : old.bolao.fechado_em ||
      (next.bolao.status !== "aberto" || expired ? now : undefined);
  next.bolao.status = next.bolao.resultado
    ? "sorteado"
    : next.bolao.fechado_em
      ? "encerrado"
      : "aberto";
  const historyAction = isReschedule
    ? `concurso_atualizado_${old.bolao.concurso_numero}_para_${next.bolao.concurso_numero}`
    : action;
  const updated = {
    ...row,
    slug: next.bolao.hash_slug,
    revision: revision + 1,
    payload: next,
    history: [
      ...row.history,
      {
        at: now,
        action: historyAction,
        digest: hashToken(JSON.stringify(next)),
      },
    ],
  };
  if (!(await store.update(updated, revision)))
    throw new HttpError(
      409,
      "Alteração concorrente: recarregue e tente novamente.",
    );
  return { ...next, revision: updated.revision, history: updated.history };
}

/**
 * Executa ações autenticadas por participante (ou auto-inscrição pública controlada)
 * com repetição automática em caso de concorrência otimista.
 */
export async function executeParticipantAction(
  store: PoolStore,
  params: {
    slug: string;
    personalToken?: string;
    action:
      | "inscrever_publico"
      | "aceitar_regras"
      | "informar_pagamento"
      | "enviar_palpite"
      | "remover_palpite";
    payload?: any;
  },
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await store.get(params.slug, false);
    if (!row) throw new HttpError(404, "Bolão não encontrado.");

    const state: PoolState = structuredClone(row.payload);
    const bolao = state.bolao;
    const frozen =
      !!bolao.fechado_em || Date.now() >= Date.parse(bolao.data_limite);
    const now = new Date().toISOString();
    const regrasHash = computeRulesHash(bolao);

    if (params.action === "inscrever_publico") {
      if (frozen)
        throw new HttpError(
          409,
          "As participações deste bolão já foram encerradas.",
        );
      if (bolao.permitir_inscricao_publica === false)
        throw new HttpError(
          403,
          "O organizador desativou novas inscrições pelo link geral.",
        );
      if (state.participantes.length >= 500)
        throw new HttpError(409, "Limite de participantes atingido.");

      const nome = String(params.payload?.nome || "").trim();
      const telefone = String(params.payload?.telefone || "").trim();
      const qtdCotas = Math.floor(Number(params.payload?.qtd_cotas) || 0);
      const aceitou = Boolean(params.payload?.aceitouRegras);

      if (nome.length < 2 || nome.length > 120)
        throw new HttpError(400, "Informe seu nome completo.");
      if (telefone.replace(/\D/g, "").length < 10 || telefone.length > 30)
        throw new HttpError(400, "Informe um WhatsApp válido com DDD.");
      if (qtdCotas < 1 || qtdCotas > 100)
        throw new HttpError(400, "Informe entre 1 e 100 cotas.");
      if (!aceitou)
        throw new HttpError(400, "É necessário aceitar as regras do bolão.");

      const newPersonalToken = token();
      const newParticipantId = randomUUID();
      const valorTotal = (qtdCotas * bolao.valor_cota).toFixed(2);

      state.participantes.push({
        id: newParticipantId,
        bolao_id: bolao.id,
        nome,
        telefone,
        qtd_cotas: qtdCotas,
        status_pagamento: "Pendente",
        data_registro: now,
        token_acesso: newPersonalToken,
        aceite_em: now,
        regras_aceitas_hash: regrasHash,
      });

      state.eventos = appendEvent(
        state.eventos,
        {
          tipo: "nova_inscricao",
          titulo: `${nome} entrou no bolão (${qtdCotas} cota(s)) e aceitou as regras`,
          participante_id: newParticipantId,
          participante_nome: nome,
          mensagem_whatsapp: `🆕 *[${bolao.nome}]* Nova participação!\n• Nome: *${nome}*\n• WhatsApp: ${telefone}\n• Cotas: *${qtdCotas}* (R$ ${valorTotal})\n• Regras aceitas em ${new Date(now).toLocaleString("pt-BR")}`,
        },
        now,
      );

      const updated: StoredPool = {
        ...row,
        revision: row.revision + 1,
        payload: state,
        history: [
          ...row.history,
          {
            at: now,
            action: `inscricao_publica_${nome.slice(0, 30)}`,
            digest: hashToken(JSON.stringify(state)),
          },
        ],
      };

      if (await store.update(updated, row.revision)) {
        return {
          createdToken: newPersonalToken,
          ...publicProjection(state, newPersonalToken),
          revision: updated.revision,
        };
      }
      continue;
    }

    // Demais ações exigem token pessoal válido
    if (!params.personalToken)
      throw new HttpError(401, "Link individual do participante necessário.");
    const idx = state.participantes.findIndex(
      (p) => p.token_acesso === params.personalToken,
    );
    if (idx === -1)
      throw new HttpError(404, "Participante não encontrado neste bolão.");

    const own = state.participantes[idx];
    let historyTag: string = params.action;

    if (params.action === "aceitar_regras") {
      own.aceite_em = now;
      own.regras_aceitas_hash = regrasHash;
      historyTag = `aceite_${own.nome.slice(0, 24)}`;
      state.eventos = appendEvent(
        state.eventos,
        {
          tipo: "regras_aceitas",
          titulo: `${own.nome} aceitou as regras do bolão`,
          participante_id: own.id,
          participante_nome: own.nome,
          mensagem_whatsapp: `✅ *[${bolao.nome}]* *${own.nome}* aceitou as regras do bolão (${own.qtd_cotas} cota(s) · R$ ${(own.qtd_cotas * bolao.valor_cota).toFixed(2)}) e visualizou o PIX.`,
        },
        now,
      );
    } else if (params.action === "informar_pagamento") {
      if (!own.aceite_em)
        throw new HttpError(400, "Aceite as regras antes de informar o pagamento.");
      own.avisou_pagamento_em = now;
      historyTag = `avisou_pix_${own.nome.slice(0, 24)}`;
      state.eventos = appendEvent(
        state.eventos,
        {
          tipo: "pagamento_informado",
          titulo: `${own.nome} informou que realizou o PIX (R$ ${(own.qtd_cotas * bolao.valor_cota).toFixed(2)})`,
          participante_id: own.id,
          participante_nome: own.nome,
          mensagem_whatsapp: `💰 *[${bolao.nome}]* Pagamento informado!\n• Participante: *${own.nome}*${own.telefone ? ` (${own.telefone})` : ""}\n• Cotas: *${own.qtd_cotas}* — *R$ ${(own.qtd_cotas * bolao.valor_cota).toFixed(2)}*\nConfira sua conta PIX e confirme o pagamento no painel do organizador para liberar a transparência completa.`,
        },
        now,
      );
    } else if (params.action === "enviar_palpite") {
      if (frozen)
        throw new HttpError(
          409,
          "Prazo encerrado: não é mais possível enviar palpites.",
        );
      if (!own.aceite_em && own.status_pagamento !== "Pago")
        throw new HttpError(400, "Aceite as regras do bolão antes de enviar palpites.");

      const dezenasRaw = params.payload?.dezenas;
      validarDezenas(dezenasRaw, bolao.modalidade);
      const dezenasOrdenadas = [...dezenasRaw].sort((a, b) => a - b);

      const palpites = state.palpites || [];
      const meusPalpites = palpites.filter((p) => p.participante_id === own.id);
      if (meusPalpites.length >= 3)
        throw new HttpError(
          400,
          "Você já atingiu o limite de 3 palpites neste bolão. Remova um anterior se quiser trocar.",
        );

      const novoPalpite: PalpiteParticipante = {
        id: randomUUID(),
        participante_id: own.id,
        participante_nome: own.nome,
        dezenas: dezenasOrdenadas,
        criado_em: now,
      };
      state.palpites = [...palpites, novoPalpite];
      historyTag = `palpite_${own.nome.slice(0, 24)}`;
      state.eventos = appendEvent(
        state.eventos,
        {
          tipo: "novo_palpite",
          titulo: `${own.nome} enviou um palpite (${dezenasOrdenadas.map((n) => String(n).padStart(2, "0")).join("-")})`,
          participante_id: own.id,
          participante_nome: own.nome,
          mensagem_whatsapp: `🎲 *[${bolao.nome}]* Novo palpite de *${own.nome}*:\nDezenas: *${dezenasOrdenadas.map((n) => String(n).padStart(2, "0")).join(" - ")}*`,
        },
        now,
      );
    } else if (params.action === "remover_palpite") {
      if (frozen)
        throw new HttpError(409, "Prazo encerrado: palpites congelados.");
      const palpiteId = String(params.payload?.palpiteId || "");
      state.palpites = (state.palpites || []).filter(
        (p) => !(p.id === palpiteId && p.participante_id === own.id),
      );
      historyTag = `palpite_removido_${own.nome.slice(0, 20)}`;
    } else {
      throw new HttpError(400, "Ação inválida.");
    }

    const updated: StoredPool = {
      ...row,
      revision: row.revision + 1,
      payload: state,
      history: [
        ...row.history,
        {
          at: now,
          action: historyTag,
          digest: hashToken(JSON.stringify(state)),
        },
      ],
    };

    if (await store.update(updated, row.revision)) {
      return {
        ...publicProjection(state, params.personalToken),
        revision: updated.revision,
      };
    }
  }

  throw new HttpError(
    409,
    "Muitas atualizações simultâneas neste bolão. Tente novamente em instantes.",
  );
}

/**
 * Consulta e confirmação (ack) de eventos para o fluxo n8n no Raspberry Pi ou painel do admin.
 */
export async function managePoolEvents(
  store: PoolStore,
  credential: string,
  options: { sinceSeq?: number; onlyUnacked?: boolean; ackUpTo?: number },
) {
  if (!credential)
    throw new HttpError(401, "Token do organizador necessário.");

  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await store.get(hashToken(credential), true);
    if (!row) throw new HttpError(403, "Token do organizador inválido.");

    const state: PoolState = structuredClone(row.payload);
    const eventos = state.eventos || [];

    if (typeof options.ackUpTo === "number" && options.ackUpTo > 0) {
      let changed = false;
      state.eventos = eventos.map((ev) => {
        if (ev.seq <= options.ackUpTo! && !ev.lido) {
          changed = true;
          return { ...ev, lido: true };
        }
        return ev;
      });
      if (changed) {
        const updated: StoredPool = {
          ...row,
          revision: row.revision + 1,
          payload: state,
          history: row.history,
        };
        if (!(await store.update(updated, row.revision))) continue;
      }
    }

    const finalEventos = (state.eventos || []).filter((ev) => {
      if (options.onlyUnacked && ev.lido) return false;
      if (typeof options.sinceSeq === "number" && ev.seq <= options.sinceSeq)
        return false;
      return true;
    });

    const pendentes = state.participantes.filter(
      (p) => p.status_pagamento === "Pendente",
    );
    const aguardandoConfirmacaoPix = pendentes.filter(
      (p) => Boolean(p.avisou_pagamento_em),
    );

    return {
      bolao: {
        id: state.bolao.id,
        nome: state.bolao.nome,
        modalidade: state.bolao.modalidade,
        concurso_numero: state.bolao.concurso_numero,
        data_limite: state.bolao.data_limite,
        data_sorteio: state.bolao.data_sorteio,
        status: state.bolao.status,
      },
      resumo: {
        total_participantes: state.participantes.length,
        pendentes: pendentes.length,
        aguardando_confirmacao_pix: aguardandoConfirmacaoPix.length,
        total_palpites: (state.palpites || []).length,
        ultimo_seq:
          (state.eventos || []).length > 0
            ? state.eventos![state.eventos!.length - 1].seq
            : 0,
      },
      eventos: finalEventos,
    };
  }

  throw new HttpError(409, "Conflito ao confirmar leitura de eventos.");
}
