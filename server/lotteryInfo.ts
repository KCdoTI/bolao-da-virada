import type { LotteryLiveInfo, OpcaoConcursoCaixa } from "../src/types/index.js";
import { getModalidadeInfo } from "../src/constants/lotteryCatalog.js";
import { HttpError } from "./poolService.js";

const ENDPOINTS: Record<string, string> = {
  "Mega-Sena": "megasena",
  Quina: "quina",
  Lotofácil: "lotofacil",
  "Dupla Sena": "duplasena",
};

// Dias habituais de sorteio (0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb)
const DRAW_WEEKDAYS: Record<string, number[]> = {
  "Mega-Sena": [2, 4, 6],
  Quina: [1, 2, 3, 4, 5, 6],
  Lotofácil: [1, 2, 3, 4, 5, 6],
  "Dupla Sena": [1, 3, 5],
};

interface CacheEntry {
  expiresAt: number;
  value: LotteryLiveInfo;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function clearLotteryInfoCache() {
  cache.clear();
}

export function brDateToSortIso(brDate: string, customHour = "20:00"): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(brDate.trim());
  if (!m) throw new HttpError(502, "Data do próximo concurso inválida na resposta da Caixa.");
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}T${customHour}:00-03:00`;
}

export function suggestDeadlineIso(drawDateBr: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(drawDateBr.trim());
  if (!m) return new Date(Date.now() + 86400000).toISOString();
  const [, dd, mm, yyyy] = m;
  const weekday = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))).getUTCDay();
  // Sábado lotéricas costumam fechar 12h -> prazo sugerido 11:00; dias úteis -> 16:30
  const hour = weekday === 6 ? "11:00" : weekday === 0 ? "10:00" : "16:30";
  return `${yyyy}-${mm}-${dd}T${hour}:00-03:00`;
}

function formatBrDate(dateUtc: Date): string {
  const dd = String(dateUtc.getUTCDate()).padStart(2, "0");
  const mm = String(dateUtc.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = dateUtc.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function generateUpcomingSchedule(
  modalidadeBase: string,
  startNumber: number,
  startBrDate: string,
  count = 4,
): { numero: number; dataBr: string; dataIso: string; prazoIso: string }[] {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(startBrDate.trim());
  if (!m) return [];
  const [, dd, mm, yyyy] = m;
  const allowedDays = DRAW_WEEKDAYS[modalidadeBase] || [2, 4, 6];
  const cursor = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  const results: { numero: number; dataBr: string; dataIso: string; prazoIso: string }[] = [];
  let nextNum = startNumber + 1;
  let safety = 0;

  while (results.length < count && safety < 30) {
    safety++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (allowedDays.includes(cursor.getUTCDay())) {
      const dataBr = formatBrDate(cursor);
      results.push({
        numero: nextNum++,
        dataBr,
        dataIso: brDateToSortIso(dataBr, "20:00"),
        prazoIso: suggestDeadlineIso(dataBr),
      });
    }
  }
  return results;
}

export function parseCaixaPortalSummary(
  raw: any,
  modalidade: string,
  fonteUrl: string,
  fonteTipo: "caixa_oficial" | "contingencia_espelho",
): LotteryLiveInfo {
  const info = getModalidadeInfo(modalidade);
  const numeroUltimo = Number(raw?.numero ?? raw?.concurso);
  const dataApuracao = String(raw?.dataApuracao ?? raw?.data ?? "");
  const dezenasRaw = raw?.listaDezenas ?? raw?.dezenas;

  if (!Number.isInteger(numeroUltimo) || numeroUltimo < 1 || !Array.isArray(dezenasRaw)) {
    throw new HttpError(502, "Resposta incompleta do portal de loterias.");
  }

  const dezenas = dezenasRaw.map((d: any) => Number(d)).filter((n: number) => Number.isInteger(n));
  const dezenas2Raw = raw?.listaDezenasSegundoSorteio ?? raw?.dezenasSegundoSorteio;
  const dezenasSegundoSorteio = Array.isArray(dezenas2Raw) && dezenas2Raw.length > 0
    ? dezenas2Raw.map((d: any) => Number(d))
    : undefined;

  const numeroProximo = Number(raw?.numeroConcursoProximo ?? raw?.proximoConcurso ?? numeroUltimo + 1);
  const dataProximo = String(raw?.dataProximoConcurso ?? raw?.dataPorExtensoProximo ?? "").trim();
  const valorEstimado = Number(raw?.valorEstimadoProximoConcurso ?? 0);

  const hasValidNextDate = /^\d{2}\/\d{2}\/\d{4}$/.test(dataProximo);
  const fallbackNext = !hasValidNextDate && /^\d{2}\/\d{2}\/\d{4}$/.test(dataApuracao)
    ? generateUpcomingSchedule(info.modalidadeBase, numeroUltimo, dataApuracao, 1)[0]
    : undefined;

  const effectiveNextDate = hasValidNextDate ? dataProximo : (fallbackNext?.dataBr || dataApuracao);
  const nextDrawIso = brDateToSortIso(effectiveNextDate, "20:00");
  const nextDeadlineIso = suggestDeadlineIso(effectiveNextDate);

  const fmtCurrency = (v: number) =>
    v > 0
      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
      : "A definir";

  const opcoesConcursos: OpcaoConcursoCaixa[] = [
    {
      numero: numeroProximo,
      dataSorteioBr: effectiveNextDate,
      dataSorteioIso: nextDrawIso,
      prazoSugeridoIso: nextDeadlineIso,
      valorEstimado: valorEstimado > 0 ? valorEstimado : undefined,
      tipo: "proximo_oficial",
      rotulo: `Concurso #${numeroProximo} — ${effectiveNextDate}${valorEstimado > 0 ? ` · Est. ${fmtCurrency(valorEstimado)}` : ""} (Próximo oficial)`,
    },
  ];

  // Próximos concursos previstos pelo calendário (útil para agendar bolão da semana seguinte)
  const upcoming = generateUpcomingSchedule(info.modalidadeBase, numeroProximo, effectiveNextDate, 4);
  for (const item of upcoming) {
    opcoesConcursos.push({
      numero: item.numero,
      dataSorteioBr: item.dataBr,
      dataSorteioIso: item.dataIso,
      prazoSugeridoIso: item.prazoIso,
      tipo: "calendario_previsto",
      rotulo: `Concurso #${item.numero} — Previsto ${item.dataBr} (Calendário ${info.modalidadeBase})`,
    });
  }

  // Concurso especial Mega da Virada quando na família Mega-Sena
  const valorEspecial = Number(raw?.valorAcumuladoConcursoEspecial ?? 0);
  if (info.modalidadeBase === "Mega-Sena") {
    const viradaNum = 3100;
    if (!opcoesConcursos.some((o) => o.numero === viradaNum)) {
      opcoesConcursos.push({
        numero: viradaNum,
        dataSorteioBr: "01/01/2027",
        dataSorteioIso: "2027-01-01T11:00:00-03:00",
        prazoSugeridoIso: "2026-12-31T16:00:00-03:00",
        valorEstimado: valorEspecial > 0 ? valorEspecial : undefined,
        tipo: "especial_oficial",
        modalidadeSugerida: "Mega da Virada",
        rotulo: `🌟 Concurso #${viradaNum} — Mega da Virada (01/01/2027 às 11h)${valorEspecial > 0 ? ` · Acumulado ${fmtCurrency(valorEspecial)}` : ""}`,
      });
    }
  }

  return {
    modalidade,
    modalidadeBase: info.modalidadeBase,
    consultadoEm: new Date().toISOString(),
    fonteTipo,
    fonteUrl,
    ultimoConcurso: {
      numero: numeroUltimo,
      dataApuracao,
      dezenas,
      dezenasSegundoSorteio,
      acumulado: Boolean(raw?.acumulado ?? raw?.acumulou),
      localSorteio: raw?.nomeMunicipioUFSorteio || raw?.localSorteio || undefined,
    },
    proximoConcurso: {
      numero: numeroProximo,
      dataProximoConcurso: effectiveNextDate,
      dataSorteioIso: nextDrawIso,
      prazoSugeridoIso: nextDeadlineIso,
      valorEstimado,
    },
    acumuladoEspecial: valorEspecial > 0
      ? { valorAcumulado: valorEspecial, numeroConcursoEspecial: info.modalidadeBase === "Mega-Sena" ? 3100 : undefined }
      : undefined,
    opcoesConcursos,
  };
}

export async function fetchLotteryLiveInfo(
  modalidade: string,
  transport: typeof fetch = fetch,
  bypassCache = false,
): Promise<LotteryLiveInfo> {
  const info = getModalidadeInfo(modalidade);
  const cacheKey = modalidade;
  const now = Date.now();

  if (!bypassCache) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > now) {
      return hit.value;
    }
  }

  const endpoint = ENDPOINTS[info.modalidadeBase] || "megasena";
  const officialUrl = `https://servicebus2.caixa.gov.br/portaldeloterias/api/${endpoint}`;

  try {
    const res = await transport(officialUrl, {
      signal: AbortSignal.timeout(8500),
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": "Mozilla/5.0 (compatible; BolaoDaMega/1.0)",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = parseCaixaPortalSummary(await res.json(), modalidade, officialUrl, "caixa_oficial");
    cache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, value: parsed });
    return parsed;
  } catch {
    // Fallback espelho público caso o IP serverless sofra bloqueio temporário na Caixa
    const mirrorUrl = `https://loteriascaixa-api.herokuapp.com/api/${endpoint}/latest`;
    try {
      const resMirror = await transport(mirrorUrl, {
        signal: AbortSignal.timeout(8500),
        headers: { Accept: "application/json" },
      });
      if (!resMirror.ok) throw new Error(`Mirror HTTP ${resMirror.status}`);
      const parsed = parseCaixaPortalSummary(await resMirror.json(), modalidade, mirrorUrl, "contingencia_espelho");
      cache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, value: parsed });
      return parsed;
    } catch {
      throw new HttpError(
        502,
        "Não foi possível obter os concursos atualizados da Caixa no momento. Tente novamente em instantes.",
      );
    }
  }
}
