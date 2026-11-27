import React, { useMemo, useState } from "react";
import type {
  Bolao,
  Jogo,
  Participante,
  PremiacaoFaixas,
  ResultadoConcurso,
} from "../types";
import { getModalidadeInfo } from "../constants/lotteryCatalog";
import { validarDezenas } from "../utils/validation";
import {
  conferirJogo,
  calcularRateioUnificado,
} from "../utils/lotteryEngine";

export const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function getTargetForJogo(j: Jogo, bolao: Bolao) {
  if (j.tipo_jogo === "troco") {
    return {
      modalidade: j.modalidade_especifica || bolao.modalidade,
      concurso: j.concurso_especifico || bolao.concurso_numero,
    };
  }
  return { modalidade: bolao.modalidade, concurso: bolao.concurso_numero };
}

export function findResultForJogo(
  j: Jogo,
  bolao: Bolao,
): ResultadoConcurso | undefined {
  const target = getTargetForJogo(j, bolao);
  if (
    target.modalidade === bolao.modalidade &&
    target.concurso === bolao.concurso_numero
  ) {
    return bolao.resultado;
  }
  return (bolao.resultados_extras || []).find(
    (r) => r.modalidade === target.modalidade && r.concurso === target.concurso,
  );
}

export function summarize(jogos: Jogo[], resultado?: ResultadoConcurso) {
  return resultado
    ? jogos.flatMap((j) =>
        resultado.sorteios.map((s, index) => ({
          ...conferirJogo(j, s.dezenas, s.premiacao, resultado.modalidade),
          sorteio: index + 1,
          tipo_jogo: j.tipo_jogo || "normal",
        })),
      )
    : [];
}

export function summarizeBolao(jogos: Jogo[], bolao: Bolao) {
  return jogos.flatMap((j) => {
    const res = findResultForJogo(j, bolao);
    if (!res) return [];
    return res.sorteios.map((s, index) => ({
      ...conferirJogo(j, s.dezenas, s.premiacao, res.modalidade),
      sorteio: index + 1,
      tipo_jogo: j.tipo_jogo || "normal",
      modalidade: res.modalidade,
      concurso: res.concurso,
    }));
  });
}

export const keysByBase: Record<string, (keyof PremiacaoFaixas)[]> = {
  "Mega-Sena": ["sena", "quina", "quadra"],
  Quina: ["quina", "quadra", "terno", "duque"],
  Lotofácil: ["pontos15", "pontos14", "pontos13", "pontos12", "pontos11"],
  "Dupla Sena": ["sena", "quina", "quadra", "terno"],
};

export function ResultadoView({
  bolao,
  jogos,
}: {
  bolao: Bolao;
  jogos: Jogo[];
}) {
  const result = bolao.resultado;
  const extras = bolao.resultados_extras || [];
  if (!result && extras.length === 0)
    return (
      <p className="card">
        Aguardando apuração. Nenhum resultado foi informado.
      </p>
    );

  const allResults = [
    ...(result ? [result] : []),
    ...extras,
  ];
  const rows = summarizeBolao(jogos, bolao);
  const totalNormais = rows
    .filter((r) => r.tipo_jogo !== "troco")
    .reduce((s, j) => s + j.premiacaoCalculada.valorTotal, 0);
  const totalTroco = rows
    .filter((r) => r.tipo_jogo === "troco")
    .reduce((s, j) => s + j.premiacaoCalculada.valorTotal, 0);
  const total = totalNormais + totalTroco;

  return (
    <section className="card space-y-4">
      <h2 className="text-xl font-bold">
        {allResults.every((r) => r.origem === "caixa_oficial")
          ? "Resultado(s) consultado(s) na Caixa"
          : "Conferência registrada (contém entrada manual — conferir recibo oficial)"}
      </h2>

      {allResults.map((res, rIdx) => (
        <div
          key={`${res.modalidade}-${res.concurso}-${rIdx}`}
          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">
              {res.modalidade} · Concurso #{res.concurso} · {res.dataApuracao}
            </p>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white border border-slate-300 font-semibold">
              {res.origem === "caixa_oficial" ? "Caixa Oficial" : "Manual"}
            </span>
          </div>

          {res.sorteios.map((draw, i) => (
            <div key={i}>
              <p className="mb-2 text-xs font-semibold">{i + 1}º sorteio</p>
              <div className="flex flex-wrap gap-2">
                {draw.dezenas.map((n) => (
                  <span key={n} className="number-ball">
                    {String(n).padStart(2, "0")}
                  </span>
                ))}
              </div>
              <p className="text-xs mt-2.5 text-slate-700">
                {Object.entries(draw.premiacao)
                  .map(([k, v]) => k + ": " + currency(v))
                  .join(" · ")}
              </p>
            </div>
          ))}

          {res.fonte && (
            <a
              className="underline break-all text-xs inline-block"
              href={res.fonte}
              target="_blank"
              rel="noreferrer"
            >
              Fonte da consulta
            </a>
          )}
        </div>
      ))}

      <div className="space-y-1">
        <p className="text-2xl font-bold text-emerald-700">
          Total calculado: {currency(total)}
        </p>
        {jogos.some((j) => j.tipo_jogo === "troco") && (
          <p className="text-xs text-slate-600">
            Jogos principais (rateio por cotas):{" "}
            <strong>{currency(totalNormais)}</strong> · Jogos de troco (divisão
            igualitária): <strong>{currency(totalTroco)}</strong>
          </p>
        )}
      </div>

      <p className="text-sm">
        O cálculo considera as dezenas cadastradas. Confira o recibo original e
        as condições de resgate na Caixa.
      </p>

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Conferência dos jogos por sorteio
            </caption>
            <thead>
              <tr>
                <th>Jogo</th>
                <th>Categoria / Concurso</th>
                <th>Sorteio</th>
                <th>Acertos</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>#{jogos.findIndex((j) => j.id === r.jogoId) + 1}</td>
                  <td>
                    {r.tipo_jogo === "troco"
                      ? `🪙 Troco (${r.modalidade} #${r.concurso})`
                      : `Principal (${r.modalidade} #${r.concurso})`}
                  </td>
                  <td>{r.sorteio}º</td>
                  <td>{r.totalAcertos}</td>
                  <td>{currency(r.premiacaoCalculada.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ExtraDrawSettlementCard({
  modalidade,
  concurso,
  existingResult,
  frozen,
  busy,
  onImportExtra,
  onSaveExtra,
}: {
  modalidade: string;
  concurso: number;
  existingResult?: ResultadoConcurso;
  frozen: boolean;
  busy: boolean;
  onImportExtra: (mod: string, conc: number) => Promise<boolean>;
  onSaveExtra: (r: ResultadoConcurso) => Promise<boolean>;
}) {
  const info = getModalidadeInfo(modalidade);
  const count = info.modalidadeBase === "Dupla Sena" ? 2 : 1;
  const keys = keysByBase[info.modalidadeBase];
  const [manual, setManual] = useState(false);
  const [date, setDate] = useState("");
  const [numbers, setNumbers] = useState<string[]>(Array(count).fill(""));
  const [prizes, setPrizes] = useState<PremiacaoFaixas[]>(
    Array.from({ length: count }, () => ({})),
  );
  const [error, setError] = useState("");

  async function submitExtra(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const sorteios = numbers.map((s, i) => {
        const dezenas = s
          .trim()
          .split(/[\s,;]+/)
          .map(Number);
        validarDezenas(dezenas, modalidade, true);
        return { dezenas, premiacao: prizes[i] };
      });
      if (
        keys.some((k) =>
          prizes.some(
            (p) =>
              typeof p[k] !== "number" || !Number.isFinite(p[k]) || p[k]! < 0,
          ),
        )
      )
        throw new Error("Preencha todos os valores, inclusive os que são zero.");

      if (
        await onSaveExtra({
          modalidade,
          concurso,
          origem: "manual",
          consultado_em: new Date().toISOString(),
          dataApuracao: date,
          sorteios,
        })
      ) {
        setManual(false);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="card border-amber-300 bg-amber-50/40 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-base text-amber-950">
          🪙 Conferência de Jogo de Troco · {info.icone} {modalidade} (Concurso #
          {concurso})
        </h3>
        {existingResult && (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
            Apurado ({existingResult.dataApuracao})
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn primary text-xs"
          disabled={!frozen || busy}
          onClick={() => void onImportExtra(modalidade, concurso)}
        >
          Consultar Caixa ({modalidade} #{concurso})
        </button>
        <button
          type="button"
          className="btn text-xs"
          disabled={!frozen || busy}
          onClick={() => setManual((v) => !v)}
        >
          Conferência manual
        </button>
      </div>

      {manual && (
        <form onSubmit={submitExtra} className="space-y-3 pt-2 border-t border-amber-200">
          <label className="text-sm">
            Data da apuração
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {Array.from({ length: count }, (_, i) => (
            <fieldset key={i} className="space-y-2">
              <legend className="text-xs font-bold">{i + 1}º sorteio</legend>
              <label className="text-sm">
                {info.qtdDezenasSorteadas} dezenas sorteadas ({modalidade}), separadas por espaço
                <input
                  required
                  value={numbers[i]}
                  onChange={(e) =>
                    setNumbers(numbers.map((v, k) => (k === i ? e.target.value : v)))
                  }
                />
              </label>
              <div className="grid sm:grid-cols-3 gap-2">
                {keys.map((k) => (
                  <label key={k} className="text-xs">
                    Prêmio ({k})
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={prizes[i][k] ?? ""}
                      onChange={(e) =>
                        setPrizes(
                          prizes.map((p, idx) =>
                            idx === i
                              ? {
                                  ...p,
                                  [k]:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                }
                              : p,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {error && <p role="alert" className="error">{error}</p>}
          <button className="btn primary text-xs" disabled={busy}>
            Salvar conferência do troco
          </button>
        </form>
      )}
    </div>
  );
}

export function PainelConferencia({
  bolao,
  jogos,
  participantes,
  onSave,
  onImport,
  onImportExtra,
  onSaveExtra,
  busy,
}: {
  bolao: Bolao;
  jogos: Jogo[];
  participantes: Participante[];
  onSave: (r: ResultadoConcurso) => Promise<boolean>;
  onImport: () => Promise<boolean>;
  onImportExtra?: (modalidade: string, concurso: number) => Promise<boolean>;
  onSaveExtra?: (r: ResultadoConcurso) => Promise<boolean>;
  busy: boolean;
}) {
  const info = getModalidadeInfo(bolao.modalidade);
  const count = info.modalidadeBase === "Dupla Sena" ? 2 : 1;
  const keys = keysByBase[info.modalidadeBase];
  const [numbers, setNumbers] = useState<string[]>(Array(count).fill(""));
  const [prizes, setPrizes] = useState<PremiacaoFaixas[]>(
    Array.from({ length: count }, () => ({})),
  );
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);

  // Detecta concursos/modalidades distintos usados em jogos de troco
  const extraTargets = useMemo(() => {
    const map = new Map<string, { modalidade: string; concurso: number }>();
    for (const j of jogos) {
      if (j.tipo_jogo !== "troco") continue;
      const t = getTargetForJogo(j, bolao);
      if (
        t.modalidade !== bolao.modalidade ||
        t.concurso !== bolao.concurso_numero
      ) {
        map.set(`${t.modalidade}::${t.concurso}`, t);
      }
    }
    return Array.from(map.values());
  }, [jogos, bolao]);

  const rows = summarizeBolao(jogos, bolao);
  const premioNormais = rows
    .filter((r) => r.tipo_jogo !== "troco")
    .reduce((s, j) => s + j.premiacaoCalculada.valorTotal, 0);
  const premioTroco = rows
    .filter((r) => r.tipo_jogo === "troco")
    .reduce((s, j) => s + j.premiacaoCalculada.valorTotal, 0);

  const frozen =
    !!bolao.fechado_em || Date.now() >= Date.parse(bolao.data_limite);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const sorteios = numbers.map((s, i) => {
        const dezenas = s
          .trim()
          .split(/[\s,;]+/)
          .map(Number);
        validarDezenas(dezenas, bolao.modalidade, true);
        return { dezenas, premiacao: prizes[i] };
      });
      if (
        keys.some((k) =>
          prizes.some(
            (p) =>
              typeof p[k] !== "number" || !Number.isFinite(p[k]) || p[k]! < 0,
          ),
        )
      )
        throw new Error(
          "Preencha todos os valores, inclusive os que são zero.",
        );
      if (
        await onSave({
          modalidade: bolao.modalidade,
          concurso: bolao.concurso_numero,
          origem: "manual",
          consultado_em: new Date().toISOString(),
          dataApuracao: date,
          sorteios,
        })
      )
        setManual(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const rateioUnificado = calcularRateioUnificado(
    participantes,
    premioNormais,
    premioTroco,
  );
  const temTroco = jogos.some((j) => j.tipo_jogo === "troco");
  const hasAnyResult = Boolean(
    bolao.resultado || (bolao.resultados_extras?.length || 0) > 0,
  );

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <h2 className="text-xl font-bold">
          Conferência principal · {bolao.modalidade} #{bolao.concurso_numero}
        </h2>
        <p>
          Os valores são salvos no bolão e compartilhados com os participantes
          com pagamento confirmado.
        </p>
        {!frozen && (
          <p className="text-amber-800">
            Feche as participações antes de apurar o concurso.
          </p>
        )}
        {jogos.length === 0 && !bolao.resultado && (
          <p className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-sm font-medium">
            ⚠️ Você ainda não cadastrou nenhum jogo neste bolão! Cadastre seus
            bilhetes na aba <strong>Jogos</strong> antes de apurar (ao salvar o
            resultado, o bolão fica definitivamente lacrado).
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            className="btn primary"
            disabled={!frozen || busy}
            onClick={() => {
              if (
                jogos.length === 0 &&
                !confirm(
                  "Nenhum jogo foi cadastrado ainda! Se apurar agora, o bolão será lacrado sem apostas. Deseja apurar mesmo assim?",
                )
              ) {
                return;
              }
              void onImport();
            }}
          >
            Consultar Caixa
          </button>
          <button
            className="btn"
            disabled={!frozen || busy}
            onClick={() => setManual(!manual)}
          >
            Conferência manual
          </button>
        </div>
        {manual && (
          <form onSubmit={submit} className="space-y-4">
            <label>
              Data da apuração
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            {Array.from({ length: count }, (_, i) => (
              <fieldset key={i} className="space-y-3">
                <legend>{i + 1}º sorteio</legend>
                <label>
                  {info.qtdDezenasSorteadas} dezenas, separadas por espaço
                  <input
                    required
                    value={numbers[i]}
                    onChange={(e) =>
                      setNumbers(
                        numbers.map((v, k) => (k === i ? e.target.value : v)),
                      )
                    }
                  />
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {keys.map((k) => (
                    <label key={k}>
                      Prêmio por aposta: {k}
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={prizes[i][k] ?? ""}
                        onChange={(e) =>
                          setPrizes(
                            prizes.map((p, index) =>
                              index === i
                                ? {
                                    ...p,
                                    [k]:
                                      e.target.value === ""
                                        ? undefined
                                        : Number(e.target.value),
                                  }
                                : p,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <p>
              Uma entrada manual será identificada como não verificada em todas
              as telas.
            </p>
            {error && <p role="alert">{error}</p>}
            <button className="btn primary" disabled={busy}>
              Salvar conferência manual
            </button>
          </form>
        )}
      </div>

      {/* Cartões dedicados de apuração para cada Jogo de Troco em outra modalidade/concurso */}
      {extraTargets.length > 0 && onImportExtra && onSaveExtra && (
        <div className="space-y-3">
          {extraTargets.map((t) => (
            <ExtraDrawSettlementCard
              key={`${t.modalidade}-${t.concurso}`}
              modalidade={t.modalidade}
              concurso={t.concurso}
              existingResult={(bolao.resultados_extras || []).find(
                (r) => r.modalidade === t.modalidade && r.concurso === t.concurso,
              )}
              frozen={frozen}
              busy={busy}
              onImportExtra={onImportExtra}
              onSaveExtra={onSaveExtra}
            />
          ))}
        </div>
      )}

      <ResultadoView bolao={bolao} jogos={jogos} />

      {hasAnyResult && (
        <div className="card">
          <h3 className="font-bold">Rateio dos participantes pagos</h3>
          <p className="text-sm mb-3">
            Jogos principais seguem a proporção de cotas; jogos de troco
            (inclusive em outras categorias de loteria) são divididos em partes
            iguais entre todos os participantes confirmados.
          </p>
          {rateioUnificado.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap justify-between items-center gap-3 py-2.5 border-b"
            >
              <div>
                <span className="font-medium">{p.nome}</span>
                <span className="text-xs text-slate-500 block">
                  {p.qtd_cotas} cota(s) · {p.status_pagamento}
                  {temTroco && p.status_pagamento === "Pago" && (
                    <>
                      {" "}
                      (Cotas: {currency(p.valorCotas || 0)} + Troco:{" "}
                      {currency(p.valorTroco || 0)})
                    </>
                  )}
                </span>
              </div>
              <strong>{currency(p.valorAReceber)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
