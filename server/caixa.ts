import type { PremiacaoFaixas, ResultadoConcurso } from "../src/types/index.js";
import { getModalidadeInfo } from "../src/constants/lotteryCatalog.js";
import { validarDezenas } from "../src/utils/validation.js";
import { HttpError } from "./poolService.js";

export const prizeKeys: Record<string, (keyof PremiacaoFaixas)[]> = {
  "Mega-Sena": ["sena", "quina", "quadra"],
  Quina: ["quina", "quadra", "terno", "duque"],
  Lotofácil: ["pontos15", "pontos14", "pontos13", "pontos12", "pontos11"],
  "Dupla Sena": ["sena", "quina", "quadra", "terno"],
};
const endpoints: Record<string, string> = {
  "Mega-Sena": "megasena",
  Quina: "quina",
  Lotofácil: "lotofacil",
  "Dupla Sena": "duplasena",
};
export function parseOfficialDraw(
  data: any,
  modalidade: string,
  concurso: number,
  fonte: string,
): ResultadoConcurso {
  const info = getModalidadeInfo(modalidade);
  if (
    data?.numero !== concurso ||
    !/^\d{2}\/\d{2}\/\d{4}$/.test(data?.dataApuracao || "")
  )
    throw new HttpError(
      502,
      "A Caixa ainda não forneceu um resultado válido para este concurso.",
    );
  const [day, month, year] = data.dataApuracao.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCDate() !== day ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCFullYear() !== year ||
    date.getTime() > Date.now() + 86400000
  )
    throw new HttpError(502, "Data de apuração inválida.");
  const arrays =
    info.modalidadeBase === "Dupla Sena"
      ? [data.listaDezenas, data.listaDezenasSegundoSorteio]
      : [data.listaDezenas];
  const keys = prizeKeys[info.modalidadeBase];
  const rateios = data.listaRateioPremio;
  if (!Array.isArray(rateios) || rateios.length !== keys.length * arrays.length)
    throw new HttpError(
      502,
      "Rateio oficial incompleto. Nenhum valor foi estimado.",
    );
  const sorteios = arrays.map((arr, index) => {
    if (
      !Array.isArray(arr) ||
      arr.some((n) => typeof n !== "string" || !/^\d{1,2}$/.test(n))
    )
      throw new HttpError(502, "Dezenas oficiais inválidas.");
    const dezenas = arr.map(Number);
    validarDezenas(dezenas, modalidade, true);
    const premiacao: PremiacaoFaixas = {};
    keys.forEach((key, k) => {
      const entries = rateios.filter(
        (r: any) => r.faixa === index * keys.length + k + 1,
      );
      const value = entries[0]?.valorPremio;
      if (
        entries.length !== 1 ||
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0
      )
        throw new HttpError(502, "Faixa de premiação inválida.");
      premiacao[key] = value;
    });
    return { dezenas: dezenas.sort((a, b) => a - b), premiacao };
  });
  return {
    modalidade,
    concurso,
    origem: "caixa_oficial",
    fonte,
    consultado_em: new Date().toISOString(),
    dataApuracao: data.dataApuracao,
    sorteios,
  };
}
export async function fetchOfficialDraw(
  modalidade: string,
  concurso: number,
  transport: typeof fetch = fetch,
) {
  const endpoint = endpoints[getModalidadeInfo(modalidade).modalidadeBase];
  const url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/${endpoint}/${concurso}`;
  try {
    const res = await transport(url, {
      signal: AbortSignal.timeout(12000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok)
      throw new HttpError(
        502,
        "Consulta à Caixa indisponível ou concurso ainda sem resultado.",
      );
    return parseOfficialDraw(await res.json(), modalidade, concurso, url);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(
      502,
      "Não foi possível consultar a Caixa. O resultado anterior foi preservado; tente novamente.",
    );
  }
}
