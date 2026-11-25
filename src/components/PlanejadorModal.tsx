import React, { useMemo, useState } from "react";
import { PlusCircle, Trash2, Sparkles } from "lucide-react";
import type { Bolao, Jogo, Participante } from "../types";
import { getModalidadeInfo } from "../constants/lotteryCatalog";
import { combinacao } from "../utils/lotteryEngine";
import { currency } from "./PainelConferencia";
import { Dialog } from "./Dialog";

interface LinhaCarteira {
  id: string;
  dezenas: number;
  quantidade: number;
}

export function PlanejadorModal({
  bolao,
  participantes = [],
  jogos = [],
  onClose,
  onIrParaVolante,
}: {
  bolao: Bolao;
  participantes?: Participante[];
  jogos?: Jogo[];
  onClose: () => void;
  onIrParaVolante?: (qtdDezenas: number) => void;
}) {
  const info = getModalidadeInfo(bolao.modalidade);
  const valorCotaCentavos = Math.round(bolao.valor_cota * 100);
  const apostaSimplesCentavos = Math.round(info.valorApostaSimples * 100);

  const totalCotasGrupo = participantes.reduce((s, p) => s + p.qtd_cotas, 0);
  const cotasPagas = participantes
    .filter((p) => p.status_pagamento === "Pago")
    .reduce((s, p) => s + p.qtd_cotas, 0);

  // Custo dos jogos que já estão cadastrados no bolão
  const custoJogosCadastradosCentavos = useMemo(
    () =>
      jogos.reduce(
        (sum, j) =>
          sum +
          combinacao(j.dezenas.length, info.minimoDezenas) *
            apostaSimplesCentavos,
        0,
      ),
    [jogos, info.minimoDezenas, apostaSimplesCentavos],
  );

  const [modoOrcamento, setModoOrcamento] = useState<
    "previsto" | "pago" | "simulacao"
  >(totalCotasGrupo > 0 ? "previsto" : "simulacao");

  const [cotasSimuladas, setCotasSimuladas] = useState(
    totalCotasGrupo > 0 ? totalCotasGrupo : 8,
  );

  const cotasBase =
    modoOrcamento === "pago"
      ? cotasPagas
      : modoOrcamento === "previsto"
        ? totalCotasGrupo
        : cotasSimuladas;

  const orcamentoCentavos = cotasBase * valorCotaCentavos;

  const initialLinhas = useMemo<LinhaCarteira[]>(() => {
    if (jogos.length > 0) {
      const counts = new Map<number, number>();
      for (const j of jogos) {
        counts.set(j.dezenas.length, (counts.get(j.dezenas.length) || 0) + 1);
      }
      return Array.from(counts.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([dezenas, quantidade], idx) => ({
          id: `init-${idx}`,
          dezenas,
          quantidade,
        }));
    }
    const baseCotas = totalCotasGrupo > 0 ? totalCotasGrupo : 8;
    const baseBudget = baseCotas * valorCotaCentavos;
    const qtdSimples = Math.max(1, Math.floor(baseBudget / apostaSimplesCentavos));
    return [
      {
        id: "linha-1",
        dezenas: info.minimoDezenas,
        quantidade: qtdSimples,
      },
    ];
  }, [jogos, totalCotasGrupo, valorCotaCentavos, apostaSimplesCentavos, info.minimoDezenas]);

  const [linhas, setLinhas] = useState<LinhaCarteira[]>(initialLinhas);

  const custoUnitarioCentavos = (dez: number) =>
    combinacao(dez, info.minimoDezenas) * apostaSimplesCentavos;

  const totalPlanejadoCentavos = linhas.reduce(
    (sum, l) => sum + l.quantidade * custoUnitarioCentavos(l.dezenas),
    0,
  );

  const totalApostasEquivalentes = linhas.reduce(
    (sum, l) => sum + l.quantidade * combinacao(l.dezenas, info.minimoDezenas),
    0,
  );

  const saldoCentavos = orcamentoCentavos - totalPlanejadoCentavos;

  const adicionarLinha = () => {
    const usadas = new Set(linhas.map((l) => l.dezenas));
    let sugerida = info.minimoDezenas;
    for (let d = info.minimoDezenas; d <= info.maximoDezenas; d++) {
      if (!usadas.has(d)) {
        sugerida = d;
        break;
      }
    }
    setLinhas((prev) => [
      ...prev,
      { id: `l-${Date.now()}`, dezenas: sugerida, quantidade: 1 },
    ]);
  };

  const sugerirCarteiraAutomatica = () => {
    let restante = orcamentoCentavos;
    const novas: LinhaCarteira[] = [];
    // Tenta encaixar 1 jogo múltiplo (ex.: +1 dezena acima do mínimo) se sobrar espaço para ao menos 2 simples
    const dezMultipla = Math.min(info.maximoDezenas, info.minimoDezenas + 1);
    const custoMultipla = custoUnitarioCentavos(dezMultipla);
    if (
      dezMultipla > info.minimoDezenas &&
      restante >= custoMultipla + apostaSimplesCentavos * 2
    ) {
      novas.push({ id: "auto-mult", dezenas: dezMultipla, quantidade: 1 });
      restante -= custoMultipla;
    }
    const qtdSimples = Math.floor(restante / apostaSimplesCentavos);
    if (qtdSimples > 0 || novas.length === 0) {
      novas.push({
        id: "auto-simp",
        dezenas: info.minimoDezenas,
        quantidade: Math.max(1, qtdSimples),
      });
    }
    setLinhas(novas);
  };

  return (
    <Dialog title="Planejador de orçamento em tempo real" onClose={onClose}>
      <div className="space-y-5">
        {/* Resumo real do bolão */}
        <section className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-bold text-slate-800">
              Situação real do bolão ({bolao.modalidade})
            </span>
            <span className="font-mono text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
              Cota: {currency(bolao.valor_cota)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Grupo cadastrado</span>
              <strong className="text-sm block">
                {participantes.length} pessoa(s) · {totalCotasGrupo} cota(s)
              </strong>
              <span className="text-xs text-slate-600">
                Previsto: {currency((totalCotasGrupo * valorCotaCentavos) / 100)}
              </span>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Já confirmado (Pago)</span>
              <strong className="text-sm text-emerald-700 block">
                {cotasPagas} cota(s) paga(s)
              </strong>
              <span className="text-xs text-emerald-700 font-semibold">
                Em caixa: {currency((cotasPagas * valorCotaCentavos) / 100)}
              </span>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Jogos já lançados</span>
              <strong className="text-sm block">{jogos.length} jogo(s)</strong>
              <span className="text-xs text-slate-600">
                Custo: {currency(custoJogosCadastradosCentavos / 100)}
              </span>
            </div>
          </div>
        </section>

        {/* Escolha da base de orçamento */}
        <div className="space-y-2">
          <span className="text-sm font-semibold block">
            Base de orçamento para planejar:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setModoOrcamento("pago")}
              className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                modoOrcamento === "pago"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="block">Só o já pago ({cotasPagas} cotas)</span>
              <span className="font-mono text-sm">
                {currency((cotasPagas * valorCotaCentavos) / 100)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setModoOrcamento("previsto")}
              className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                modoOrcamento === "previsto"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="block">
                Total cadastrado ({totalCotasGrupo} cotas)
              </span>
              <span className="font-mono text-sm">
                {currency((totalCotasGrupo * valorCotaCentavos) / 100)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setModoOrcamento("simulacao")}
              className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                modoOrcamento === "simulacao"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="block">Simular outra meta</span>
              <span className="font-mono text-sm">
                {cotasSimuladas} cotas ({currency((cotasSimuladas * valorCotaCentavos) / 100)})
              </span>
            </button>
          </div>

          {modoOrcamento === "simulacao" && (
            <label className="pt-2">
              Quantidade de cotas na simulação
              <input
                type="number"
                min="1"
                max="1000000"
                value={cotasSimuladas}
                onChange={(e) =>
                  setCotasSimuladas(
                    Math.max(1, Math.min(1000000, Number(e.target.value) || 1)),
                  )
                }
              />
            </label>
          )}
        </div>

        {/* Montador de Carteira com dezenas variáveis */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-sm">
              Montar combinações e dezenas por jogo
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={sugerirCarteiraAutomatica}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={13} />
                Sugerir distribuição
              </button>
              <button
                type="button"
                onClick={adicionarLinha}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle size={13} />
                Outra faixa de dezenas
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {linhas.map((linha) => {
              const unit = custoUnitarioCentavos(linha.dezenas);
              const sub = unit * linha.quantidade;
              return (
                <div
                  key={linha.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                >
                  <label className="sm:col-span-5 text-xs">
                    Dezenas no volante
                    <select
                      value={linha.dezenas}
                      onChange={(e) => {
                        const dez = Number(e.target.value);
                        setLinhas((prev) =>
                          prev.map((item) =>
                            item.id === linha.id ? { ...item, dezenas: dez } : item,
                          ),
                        );
                      }}
                    >
                      {Array.from(
                        { length: info.maximoDezenas - info.minimoDezenas + 1 },
                        (_, idx) => {
                          const d = info.minimoDezenas + idx;
                          const c = custoUnitarioCentavos(d) / 100;
                          return (
                            <option key={d} value={d}>
                              {d} dezenas ({currency(c)}/jogo)
                            </option>
                          );
                        },
                      )}
                    </select>
                  </label>

                  <label className="sm:col-span-3 text-xs">
                    Qtd. de jogos
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={linha.quantidade}
                      onChange={(e) => {
                        const q = Math.max(0, Math.min(500, Math.floor(Number(e.target.value) || 0)));
                        setLinhas((prev) =>
                          prev.map((item) =>
                            item.id === linha.id ? { ...item, quantidade: q } : item,
                          ),
                        );
                      }}
                    />
                  </label>

                  <div className="sm:col-span-3 text-xs sm:text-right pb-1">
                    <span className="text-slate-500 block">Subtotal</span>
                    <strong className="font-mono text-sm">
                      {currency(sub / 100)}
                    </strong>
                  </div>

                  <div className="sm:col-span-1 flex justify-end pb-1">
                    {linhas.length > 1 && (
                      <button
                        type="button"
                        aria-label="Remover faixa"
                        onClick={() =>
                          setLinhas((prev) => prev.filter((i) => i.id !== linha.id))
                        }
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Resultado financeiro do planejamento */}
        <section
          className={`p-4 rounded-xl border space-y-1.5 ${
            saldoCentavos >= 0
              ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
              : "bg-red-50 border-red-300 text-red-950"
          }`}
        >
          <div className="flex justify-between text-sm">
            <span>Orçamento considerado ({cotasBase} cotas):</span>
            <strong className="font-mono">{currency(orcamentoCentavos / 100)}</strong>
          </div>
          <div className="flex justify-between text-sm">
            <span>
              Total planejado ({totalApostasEquivalentes} aposta(s) simples equiv.):
            </span>
            <strong className="font-mono">
              {currency(totalPlanejadoCentavos / 100)}
            </strong>
          </div>
          <div className="flex justify-between text-base pt-1 border-t border-current/15">
            <span className="font-bold">
              {saldoCentavos >= 0 ? "Sobra / Troco estimado:" : "Falta arrecadar:"}
            </span>
            <strong className="font-mono">
              {currency(Math.abs(saldoCentavos) / 100)}
            </strong>
          </div>
        </section>

        {onIrParaVolante && linhas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                onIrParaVolante(linhas[0].dezenas);
              }}
            >
              Abrir volante para cadastrar jogo
            </button>
          </div>
        )}

        <p className="text-xs text-slate-600">
          Estimativa baseada na tabela oficial da Caixa (sem tarifa de serviço de
          bolão pronto de lotérica). Combine com o grupo o destino de eventual
          troco.
        </p>
      </div>
    </Dialog>
  );
}
