import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolStore, StoredPool } from "./store.js";
import type { PoolState } from "../src/types/index.js";
import {
  CATALOGO_MODALIDADES,
  getModalidadeInfo,
} from "../src/constants/lotteryCatalog.js";
import { validarDezenas } from "../src/utils/validation.js";
import { conferirJogo, calcularRateio } from "../src/utils/lotteryEngine.js";

const text = z.string().max(200);
const date = z.string().datetime({ offset: true });
const prizes = z.record(z.string(), z.number().finite().min(0).max(1e12));
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
      }),
    )
    .max(200),
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
export function validateState(raw: unknown): PoolState {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new HttpError(
      400,
      `Dados inválidos: ${parsed.error.issues[0].path.join(".")}.`,
    );
  const s = parsed.data as PoolState;
  for (const j of s.jogos) validarDezenas(j.dezenas, s.bolao.modalidade);
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
export function publicProjection(s: PoolState, personalToken?: string) {
  const own = personalToken
    ? s.participantes.find((p) => p.token_acesso === personalToken)
    : undefined;
  if (personalToken && !own)
    throw new HttpError(404, "Link pessoal não encontrado.");
  const { chave_pix_organizador, ...bolao } = s.bolao;
  const totalPremio = s.bolao.resultado
    ? s.jogos.reduce(
        (sum, j) =>
          sum +
          s.bolao.resultado!.sorteios.reduce(
            (n, draw) =>
              n +
              conferirJogo(j, draw.dezenas, draw.premiacao, s.bolao.modalidade)
                .premiacaoCalculada.valorTotal,
            0,
          ),
        0,
      )
    : 0;
  const rateioPessoal = own
    ? calcularRateio(s.participantes, totalPremio).find((p) => p.id === own.id)
        ?.valorAReceber
    : undefined;
  return {
    totalPremio,
    rateioPessoal,
    bolao: {
      ...bolao,
      chave_pix_organizador: own ? chave_pix_organizador : "",
    },
    jogos: s.jogos.map(({ id, dezenas, criado_em }) => ({
      id,
      bolao_id: bolao.id,
      dezenas,
      criado_em,
    })),
    participantes: own
      ? [{ ...own, telefone: "", token_acesso: undefined }]
      : [],
    resumo: {
      participantes: s.participantes.length,
      cotas: s.participantes.reduce((n, p) => n + p.qtd_cotas, 0),
      cotas_pagas: s.participantes
        .filter((p) => p.status_pagamento === "Pago")
        .reduce((n, p) => n + p.qtd_cotas, 0),
    },
  };
}
export async function createPool(store: PoolStore, input: unknown) {
  const state = validateState(input);
  const adminToken = token();
  const id = randomUUID();
  const now = new Date().toISOString();
  state.bolao = {
    ...state.bolao,
    id,
    hash_slug: token(),
    status: "aberto",
    fechado_em: undefined,
    resultado: undefined,
  };
  state.participantes = state.participantes.slice(0, 10).map((p) => ({
    ...p,
    id: randomUUID(),
    bolao_id: id,
    token_acesso: token(),
    data_registro: now,
    pago_em: p.status_pagamento === "Pago" ? now : undefined,
  }));
  state.jogos = [];
  const row: StoredPool = {
    id,
    slug: state.bolao.hash_slug,
    admin: hashToken(adminToken),
    revision: 1,
    payload: state,
    history: [],
  };
  row.history.push({
    at: new Date().toISOString(),
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
    ? { ...row.payload, revision: row.revision, history: row.history }
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
      participantes: s.participantes,
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
      throw new HttpError(400, "Defina um novo prazo futuro para o próximo concurso.");
    if (
      next.bolao.concurso_numero === old.bolao.concurso_numero &&
      next.bolao.modalidade === old.bolao.modalidade &&
      next.bolao.data_limite === old.bolao.data_limite
    ) {
      throw new HttpError(400, "Selecione o novo concurso ou um novo prazo.");
    }
  }
  const expired = Date.now() >= Date.parse(old.bolao.data_limite);
  if (!isReschedule && (old.bolao.fechado_em || expired) && financial(next) !== financial(old))
    throw new HttpError(
      409,
      "Prazo encerrado: participantes, pagamentos, regras e jogos estão congelados.",
    );
  if (!isReschedule && old.bolao.fechado_em && next.bolao.status === "aberto")
    throw new HttpError(409, "Um bolão fechado não pode ser reaberto.");
  if (next.bolao.resultado && !old.bolao.fechado_em && !expired)
    throw new HttpError(409, "Feche as participações antes de apurar.");
  for (const game of next.jogos) {
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
      pago_em:
        p.status_pagamento === "Pago"
          ? previous?.status_pagamento === "Pago"
            ? previous.pago_em
            : now
          : undefined,
    };
  });
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
      { at: now, action: historyAction, digest: hashToken(JSON.stringify(next)) },
    ],
  };
  if (!(await store.update(updated, revision)))
    throw new HttpError(
      409,
      "Alteração concorrente: recarregue e tente novamente.",
    );
  return { ...next, revision: updated.revision, history: updated.history };
}
