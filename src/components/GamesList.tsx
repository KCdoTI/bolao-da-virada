import React, { useState } from 'react';
import { Ticket, PlusCircle, Receipt, Trash2, Search, Sparkles, Filter, X } from 'lucide-react';
import { Jogo } from '../types';
import { TicketViewerModal } from './TicketViewerModal';

interface GamesListProps {
  jogos: Jogo[];
  onOpenNovoJogo: () => void;
  onRemoveJogo: (id: string) => void;
  onOpenAiConsultant?: () => void;
}

export const GamesList: React.FC<GamesListProps> = ({
  jogos,
  onOpenNovoJogo,
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

  // Filtra jogos pela dezena buscada
  const jogosFiltrados = filtroDezena
    ? jogos.filter((j) => j.dezenas.includes(filtroDezena))
    : jogos;

  // Dezenas únicas jogadas no bolão
  const todasDezenas = Array.from(new Set(jogos.flatMap((j) => j.dezenas))).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Header da Seção de Jogos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
              Apostas Registradas na Lotérica ({jogos.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {todasDezenas.length} dezenas distintas cobertas em {jogos.length} bilhetes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenAiConsultant && (
            <button
              type="button"
              onClick={onOpenAiConsultant}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black py-2 px-3.5 rounded-xl transition active:scale-95 shadow-xs"
            >
              <Sparkles size={14} />
              <span>Consultor IA & Gerador</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNovoJogo}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition active:scale-95 shadow-xs"
          >
            <PlusCircle size={15} />
            <span>Novo Jogo (Volante / OCR)</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtro Rápido por Dezena (UX Interativa) */}
      {jogos.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Search size={13} />
              <span>Filtrar por dezena apostada:</span>
            </span>

            {/* Dezenas em pílulas clicáveis */}
            <div className="flex items-center gap-1 flex-wrap max-h-16 overflow-y-auto">
              {todasDezenas.slice(0, 15).map((num) => {
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
                Dezena {filtroDezena < 10 ? `0${filtroDezena}` : filtroDezena} presente em {jogosFiltrados.length} {jogosFiltrados.length === 1 ? 'jogo' : 'jogos'}
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
            Use o volante manual, tire uma foto com nosso leitor OCR ou use o Consultor IA!
          </p>
          <button
            type="button"
            onClick={onOpenNovoJogo}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            <PlusCircle size={15} />
            <span>Cadastrar Primeiro Jogo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {jogosFiltrados.map((jogo, index) => {
            const gameNumber = jogos.length - index;
            return (
              <div
                key={jogo.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border transition flex flex-col justify-between ${
                  filtroDezena && jogo.dezenas.includes(filtroDezena)
                    ? 'border-amber-400 ring-2 ring-amber-400/40'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Jogo #{gameNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        • {jogo.dezenas.length} dezenas
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {jogo.foto_url && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTicket({
                              open: true,
                              imageUrl: jogo.foto_url,
                              index: gameNumber,
                              dezenas: jogo.dezenas,
                              codigo: jogo.codigo_bilhete,
                            })
                          }
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg transition"
                        >
                          <Receipt size={13} />
                          <span>Ver Comprovante</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onRemoveJogo(jogo.id)}
                        aria-label={`Excluir jogo #${gameNumber}`}
                        className="p-1 text-slate-300 hover:text-red-500 rounded-md transition"
                        title="Excluir aposta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Dezenas Sorteadas / Marcadas em Bolinhas */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {jogo.dezenas.map((num) => {
                      const isFiltroMatch = filtroDezena === num;
                      return (
                        <span
                          key={num}
                          className={`h-8 w-8 rounded-full font-extrabold text-xs flex items-center justify-center shadow-xs transition ${
                            isFiltroMatch
                              ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-110'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {num < 10 ? `0${num}` : num}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Registrado em: {jogo.criado_em}</span>
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

      {/* Modal de Comprovante */}
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
