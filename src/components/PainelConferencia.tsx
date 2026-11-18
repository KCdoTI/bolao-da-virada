import React, { useState } from "react";
import type {
  Bolao,
  Jogo,
  Participante,
  PremiacaoFaixas,
  ResultadoConcurso,
} from "../types";
import { getModalidadeInfo } from "../constants/lotteryCatalog";
import { validarDezenas } from "../utils/validation";
import { conferirJogo, calcularRateio } from "../utils/lotteryEngine";
export const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function summarize(jogos: Jogo[], resultado?: ResultadoConcurso) {
  return resultado
    ? jogos.flatMap((j) =>
        resultado.sorteios.map((s, index) => ({
          ...conferirJogo(j, s.dezenas, s.premiacao, resultado.modalidade),
          sorteio: index + 1,
        })),
      )
    : [];
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
  if (!result)
    return (
      <p className="card">
        Aguardando apuração. Nenhum resultado foi informado.
      </p>
    );
  const rows = summarize(jogos, result);
  const total = rows.reduce((s, j) => s + j.premiacaoCalculada.valorTotal, 0);
  return (
    <section className="card space-y-4">
      <h2 className="text-xl font-bold">
        {result.origem === "caixa_oficial"
          ? "Resultado consultado na Caixa"
          : "Conferência manual — não verificada pela Caixa"}
      </h2>
      <p>
        {result.modalidade} · Concurso {result.concurso} · {result.dataApuracao}
      </p>
      {result.sorteios.map((draw, i) => (
        <div key={i}>
          <p className="mb-2 font-semibold">{i + 1}º sorteio</p>
          <div className="flex flex-wrap gap-2">
            {draw.dezenas.map((n) => (
              <span key={n} className="number-ball">
                {String(n).padStart(2, "0")}
              </span>
            ))}
          </div>
          <p className="text-sm mt-3">
            {Object.entries(draw.premiacao)
              .map(([k, v]) => k + ": " + currency(v))
              .join(" · ")}
          </p>
        </div>
      ))}
      <p className="text-2xl font-bold text-emerald-700">
        Total calculado: {currency(total)}
      </p>
      <p className="text-sm">
        O cálculo considera as dezenas cadastradas. Confira o recibo original e
        as condições de resgate na Caixa.
      </p>
      {result.fonte && (
        <a
          className="underline break-all"
          href={result.fonte}
          target="_blank"
          rel="noreferrer"
        >
          Fonte da consulta
        </a>
      )}
      <p className="text-xs">
        Registrado em {new Date(result.consultado_em).toLocaleString("pt-BR")}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Conferência dos jogos por sorteio
          </caption>
          <thead>
            <tr>
              <th>Jogo</th>
              <th>Sorteio</th>
              <th>Acertos</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{jogos.findIndex((j) => j.id === r.jogoId) + 1}</td>
                <td>{r.sorteio}</td>
                <td>{r.totalAcertos}</td>
                <td>{currency(r.premiacaoCalculada.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function PainelConferencia({
  bolao,
  jogos,
  participantes,
  onSave,
  onImport,
  busy,
}: {
  bolao: Bolao;
  jogos: Jogo[];
  participantes: Participante[];
  onSave: (r: ResultadoConcurso) => Promise<boolean>;
  onImport: () => Promise<boolean>;
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
  const total = summarize(jogos, bolao.resultado).reduce(
    (s, j) => s + j.premiacaoCalculada.valorTotal,
    0,
  );
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
  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <h2 className="text-xl font-bold">
          Conferência do concurso {bolao.concurso_numero}
        </h2>
        <p>
          Os valores são salvos no bolão e compartilhados com os participantes.
        </p>
        {!frozen && (
          <p className="text-amber-800">
            Feche as participações antes de apurar o concurso.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            className="btn primary"
            disabled={!frozen || busy}
            onClick={() => void onImport()}
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
      <ResultadoView bolao={bolao} jogos={jogos} />
      {bolao.resultado && (
        <div className="card">
          <h3 className="font-bold">Rateio das cotas pagas</h3>
          <p className="text-sm mb-3">
            Centavos restantes são distribuídos pelas maiores frações; empate
            pelo identificador do participante.
          </p>
          {calcularRateio(participantes, total).map((p) => (
            <p key={p.id} className="flex justify-between gap-3 py-2 border-b">
              {p.nome}
              <strong>{currency(p.valorAReceber)}</strong>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
