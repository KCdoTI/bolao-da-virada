import React, { useMemo, useState } from 'react';
import {
  Ticket,
  PlusCircle,
  Receipt,
  Trash2,
  Search,
  Sparkles,
  X,
  Coins,
  Lightbulb,
} from 'lucide-react';
import { Jogo, PalpiteParticipante, TipoJogoBolao } from '../types';
import { TicketViewerModal } from './TicketViewerModal';
import { getModalidadeInfo } from '../constants/lotteryCatalog';

interface GamesListProps {
  readOnly?: boolean;
  jogos: Jogo[];
  palpites?: PalpiteParticipante[];
  modalidade?: string;
  onOpenNovoJogo: (tipo?: TipoJogoBolao) => void;
  onUsarDezenasNoVolante?: (dezenas: number[], tipo?: TipoJogoBolao) => void;
  onRemoveJogo: (id: string) => void;
  onOpenAiConsultant?: () => void;
}

export const GamesList: React.FC<GamesListProps> = ({
  readOnly = false,
  jogos,
  palpites = [],
  modalidade = 'Mega-Sena',
  onOpenNovoJogo,
  onUsarDezenasNoVolante,
  onRemoveJogo,
  onOpenAiConsultant,
}) => {
  const [selectedTicket, setSelectedTicket] = useState<{
    open: boolean;
    imageUrl?: string;
    index: number;
    dezenas: number[];
    codigo?: string;
  }>({
    open: false,
    index: 0,
    dezenas: [],
  });

  const [filtroDezena, setFiltroDezena] = useState<number | null>(null);
  const info = getModalidadeInfo(modalidade);
  const [qtdTopPalpite, setQtdTopPalpite] = useState<number>(info.minimoDezenas);

  const jogosFiltrados = filtroDezena
    ? jogos.filter((j) => j.dezenas.includes(filtroDezena))
    : jogos;

  const todasDezenas = Array.from(new Set(jogos.flatMap((j) => j.dezenas))).sort(
    (a, b) => a - b,
  );

  const qtdTroco = jogos.filter((j) => j.tipo_jogo === 'troco').length;
  const qtdNormais = jogos.length - qtdTroco;

  // Ranking das dezenas mais votadas nos palpites dos participantes
  const topDezenasPalpites = useMemo(() => {
    const freq = new Map<number, number>();
    for (const p of palpites) {
      for (const d of p.dezenas) {
        freq.set(d, (freq.get(d) || 0) + 1);
      }
    }
    return Array.from(freq.entries()).sort((a, b) =>
      b[1] !== a[1] ? b[1] - a[1] : a[0] - b[0],
    );
  }, [palpites]);

  return (
    <div className="space-y-5">
      {/* Header da Seção de Jogos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
              Apostas Registradas ({jogos.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {qtdNormais} principal(is) · {qtdTroco} de troco · {todasDezenas.length} dezenas distintas cobertas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenAiConsultant && (
            <button
              type="button"
              disabled={readOnly}
              onClick={onOpenAiConsultant}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-semibold py-2 px-3.5 rounded-xl transition-all active:scale-[0.98] shadow-xs cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Surpresinha rápida</span>
            </button>
          )}

          <button
            type="button"
            disabled={readOnly}
            onClick={() => onOpenNovoJogo('troco')}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-all active:scale-[0.98] shadow-xs cursor-pointer"
          >
            <Coins size={15} />
            <span>Novo Jogo de Troco</span>
          </button>

          <button
            type="button"
            disabled={readOnly}
            onClick={() => onOpenNovoJogo('normal')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-all active:scale-[0.98] shadow-xs cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Novo Jogo Principal</span>
          </button>
        </div>
      </div>

      {/* Painel de Palpites dos Participantes */}
      {palpites.length > 0 && (
        <section className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lightbulb size={18} className="text-indigo-600" />
              <h3 className="font-bold text-sm text-indigo-950">
                Palpites enviados pelos participantes ({palpites.length})
              </h3>
            </div>
            {!readOnly &&
              onUsarDezenasNoVolante &&
              topDezenasPalpites.length >= info.minimoDezenas && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    aria-label="Quantidade de dezenas mais votadas para montar o jogo"
                    value={Math.min(qtdTopPalpite, topDezenasPalpites.length)}
                    onChange={(e) => setQtdTopPalpite(Number(e.target.value))}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white border border-indigo-300 text-indigo-950"
                  >
                    {Array.from(
                      {
                        length:
                          Math.min(info.maximoDezenas, topDezenasPalpites.length) -
                          info.minimoDezenas +
                          1,
                      },
                      (_, idx) => info.minimoDezenas + idx,
                    ).map((q) => (
                      <option key={q} value={q}>
                        {q} dezenas
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const alvo = Math.min(
                        qtdTopPalpite,
                        topDezenasPalpites.length,
                      );
                      const escolhidas = topDezenasPalpites
                        .slice(0, alvo)
                        .map(([num]) => num)
                        .sort((a, b) => a - b);
                      onUsarDezenasNoVolante(escolhidas, 'normal');
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                  >
                    Montar jogo com as{' '}
                    {Math.min(qtdTopPalpite, topDezenasPalpites.length)} mais
                    votadas
                  </button>
                </div>
              )}
          </div>

          {topDezenasPalpites.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-indigo-900 font-semibold mr-1">
                Mais pedidas pela turma:
              </span>
              {topDezenasPalpites.slice(0, 12).map(([num, votos]) => (
                <span
                  key={num}
                  className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-900 font-mono font-bold"
                >
                  {String(num).padStart(2, '0')}{' '}
                  <small className="font-sans text-indigo-600">({votos}x)</small>
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {palpites.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl p-3 border border-indigo-100 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <strong className="text-slate-800 truncate">
                    {p.participante_nome}{' '}
                    <span className="font-normal text-slate-500">
                      ({p.dezenas.length}{' '}
                      {p.dezenas.length === 1 ? 'dezena' : 'dezenas'})
                    </span>
                  </strong>
                  {!readOnly && onUsarDezenasNoVolante && (
                    <button
                      type="button"
                      onClick={() => onUsarDezenasNoVolante(p.dezenas, 'normal')}
                      className="text-indigo-700 hover:underline font-semibold shrink-0 cursor-pointer"
                    >
                      Usar no volante
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.dezenas.map((n) => (
                    <span
                      key={n}
                      className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-900 font-mono font-bold text-xs flex items-center justify-center"
                    >
                      {String(n).padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Barra de Filtro Rápido por Dezena */}
      {jogos.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Search size={13} />
              <span>Filtrar por dezena apostada:</span>
            </span>

            <div className="flex items-center gap-1 flex-wrap max-h-16 overflow-y-auto">
              {todasDezenas.slice(0, 18).map((num) => {
                const isSelected = filtroDezena === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFiltroDezena(isSelected ? null : num)}
                    className={`w-7 h-7 rounded-full text-[11px] font-extrabold flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100'
                    }`}
                  >
                    {num < 10 ? `0${num}` : num}
                  </button>
                );
              })}
            </div>
          </div>

          {filtroDezena !== null && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Dezena {filtroDezena < 10 ? `0${filtroDezena}` : filtroDezena} em{' '}
                {jogosFiltrados.length}{' '}
                {jogosFiltrados.length === 1 ? 'jogo' : 'jogos'}
              </span>
              <button
                type="button"
                onClick={() => setFiltroDezena(null)}
                className="text-slate-400 hover:text-red-500 p-1 rounded-md"
                title="Limpar filtro"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {jogos.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <Ticket size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium">Nenhum jogo cadastrado ainda no bolão.</p>
          <p className="text-xs text-slate-500">
            Use o volante manual, tire foto com a câmera no leitor OCR ou aproveite os palpites do grupo!
          </p>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onOpenNovoJogo('normal')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            <PlusCircle size={15} />
            <span>Cadastrar Primeiro Jogo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {jogosFiltrados.map((jogo) => {
            const realIndex = jogos.findIndex((x) => x.id === jogo.id) + 1;
            const isTroco = jogo.tipo_jogo === 'troco';
            return (
              <div
                key={jogo.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border transition flex flex-col justify-between ${
                  filtroDezena && jogo.dezenas.includes(filtroDezena)
                    ? 'border-amber-400 ring-2 ring-amber-400/40'
                    : isTroco
                      ? 'border-amber-300/90 bg-amber-50/20'
                      : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Jogo #{realIndex}
                      </span>
                      {isTroco ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <Coins size={10} />
                          Troco
                          {jogo.modalidade_especifica
                            ? ` · ${jogo.modalidade_especifica}${jogo.concurso_especifico ? ` #${jogo.concurso_especifico}` : ''}`
                            : jogo.concurso_especifico
                              ? ` · #${jogo.concurso_especifico}`
                              : ''}{' '}
                          · Divisão Igual
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          • {jogo.dezenas.length} dezenas
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {jogo.foto_url && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTicket({
                              open: true,
                              imageUrl: jogo.foto_url,
                              index: realIndex,
                              dezenas: jogo.dezenas,
                              codigo: jogo.codigo_bilhete,
                            })
                          }
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          <Receipt size={13} />
                          <span>Ver Comprovante</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => onRemoveJogo(jogo.id)}
                        aria-label={`Excluir jogo #${realIndex}`}
                        className="p-1 text-slate-300 hover:text-red-500 rounded-md transition"
                        title="Excluir aposta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Dezenas em Bolinhas */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {jogo.dezenas.map((num) => {
                      const isFiltroMatch = filtroDezena === num;
                      return (
                        <span
                          key={num}
                          className={`h-8 w-8 rounded-full font-extrabold text-xs flex items-center justify-center shadow-xs transition ${
                            isFiltroMatch
                              ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-110'
                              : isTroco
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {num < 10 ? `0${num}` : num}
                        </span>
                      );
                    })}
                  </div>

                  {jogo.observacao && (
                    <p className="text-xs text-slate-600 italic mb-2">
                      {jogo.observacao}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Registrado em:{' '}
                    {new Date(jogo.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                  {jogo.codigo_bilhete && (
                    <span className="font-mono text-[10px] text-slate-500">
                      ID: {jogo.codigo_bilhete}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TicketViewerModal
        isOpen={selectedTicket.open}
        onClose={() => setSelectedTicket({ ...selectedTicket, open: false })}
        imageUrl={selectedTicket.imageUrl}
        gameIndex={selectedTicket.index}
        dezenas={selectedTicket.dezenas}
        codigoBilhete={selectedTicket.codigo}
      />
    </div>
  );
};
