import React, { useState } from 'react';
import {
  Trophy,
  RotateCcw,
  SlidersHorizontal,
  Send,
  CheckCircle2,
  Sparkles,
  Coins,
  Smartphone,
  ExternalLink,
  Receipt,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Jogo, Participante, PremiacaoFaixas } from '../types';
import { conferirJogo, calcularRateio } from '../utils/lotteryEngine';
import { fetchMegaSenaDraw } from '../services/caixaLotteryService';
import { buildWhatsAppPayoutMessage } from '../utils/transparency';
import { TicketViewerModal } from './TicketViewerModal';

interface PainelConferenciaProps {
  bolaoNome: string;
  concursoNumero: number;
  chavePixOrganizador: string;
  jogos: Jogo[];
  participantes: Participante[];
  dezenasSorteadas: number[];
  onUpdateDezenasSorteadas: (dezenas: number[]) => void;
}

export const PainelConferencia: React.FC<PainelConferenciaProps> = ({
  bolaoNome,
  concursoNumero,
  chavePixOrganizador,
  jogos,
  participantes,
  dezenasSorteadas,
  onUpdateDezenasSorteadas,
}) => {
  const [modoManual, setModoManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<string | null>(null);

  const [premios, setPremios] = useState<PremiacaoFaixas>({
    sena: 550000000,
    quina: 70000,
    quadra: 1200,
  });

  const [selectedTicket, setSelectedTicket] = useState<{
    open: boolean;
    imageUrl?: string;
    gameIndex: number;
    dezenas: number[];
    codigo?: string;
  }>({
    open: false,
    gameIndex: 0,
    dezenas: [],
  });

  // Busca na API da Caixa ou Fallback
  const handleBuscarOficial = async () => {
    setLoading(true);
    setApiFeedback(null);
    try {
      const data = await fetchMegaSenaDraw(concursoNumero);
      if (data.dezenas && data.dezenas.length === 6) {
        onUpdateDezenasSorteadas(data.dezenas);
        if (data.premiacao) {
          setPremios(data.premiacao);
        }
        setApiFeedback(
          data.origem === 'caixa_oficial'
            ? 'Resultado oficial sincronizado com sucesso da Caixa!'
            : 'Resultado obtido via base de contingência da Mega da Virada.'
        );
      }
    } catch {
      setApiFeedback('Não foi possível conectar aos servidores da Caixa. Ajuste manualmente abaixo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDezenaManualChange = (index: number, val: string) => {
    const num = parseInt(val, 10);
    const novas = [...dezenasSorteadas];
    novas[index] = isNaN(num) ? 0 : Math.min(60, Math.max(1, num));
    onUpdateDezenasSorteadas(novas);
  };

  // Motor de Conferência com cálculo combinatório
  const jogosConferidos = jogos.map((j) => conferirJogo(j, dezenasSorteadas, premios));

  const totalSenas = jogosConferidos.reduce((acc, j) => acc + j.premiacaoCalculada.senas, 0);
  const totalQuinas = jogosConferidos.reduce((acc, j) => acc + j.premiacaoCalculada.quinas, 0);
  const totalQuadras = jogosConferidos.reduce((acc, j) => acc + j.premiacaoCalculada.quadras, 0);
  const totalPremioBolao = jogosConferidos.reduce(
    (acc, j) => acc + j.premiacaoCalculada.valorTotal,
    0
  );

  // Rateio estritamente restrito a cotistas com pagamento confirmado
  const rateio = calcularRateio(participantes, totalPremioBolao);
  const cotistasPagos = participantes.filter((p) => p.status_pagamento === 'Pago');
  const totalCotasPagas = cotistasPagos.reduce((acc, p) => acc + p.qtd_cotas, 0);

  const dispararConfetes = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignora caso canvas não esteja disponível
    }
  };

  const enviarWhatsAppCotista = (p: typeof rateio[0]) => {
    const rawMsg = buildWhatsAppPayoutMessage(
      p.nome,
      bolaoNome,
      totalPremioBolao,
      p.qtd_cotas,
      p.valorAReceber,
      chavePixOrganizador
    );
    const encoded = encodeURIComponent(rawMsg);
    window.open(`https://api.whatsapp.com/send?phone=55${p.telefone.replace(/\D/g, '')}&text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Bloco de Sorteio e Dezenas */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                Concurso Oficial: #{concursoNumero}
              </span>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Mega da Virada
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Motor de conferência oficial da Caixa com desdobramento matemático para apostas de 6 a 15 números.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModoManual(!modoManual)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            >
              <SlidersHorizontal size={14} />
              <span>{modoManual ? 'Fixar Dezenas' : 'Simulação Manual'}</span>
            </button>

            <button
              type="button"
              onClick={handleBuscarOficial}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 shadow-xs"
            >
              <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Buscar da Caixa</span>
            </button>
          </div>
        </div>

        {apiFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{apiFeedback}</span>
          </div>
        )}

        {/* Display das 6 Dezenas Sorteadas */}
        <div className="pt-5 flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Dezenas Sorteadas no Concurso
          </span>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {dezenasSorteadas.map((dezena, idx) =>
              modoManual ? (
                <input
                  key={idx}
                  type="number"
                  min={1}
                  max={60}
                  value={dezena || ''}
                  aria-label={`Dezena sorteada número ${idx + 1}`}
                  onChange={(e) => handleDezenaManualChange(idx, e.target.value)}
                  className="w-12 h-12 text-center text-lg font-black rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-xs"
                />
              ) : (
                <div
                  key={idx}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-700/20 ring-4 ring-emerald-100 dark:ring-emerald-950/60 select-none"
                >
                  {dezena < 10 ? `0${dezena}` : dezena}
                </div>
              )
            )}
          </div>

          {modoManual && (
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Dica: Digite 6 dezenas (1 a 60) para simular instantaneamente os acertos do bolão.
            </p>
          )}
        </div>
      </div>

      {/* Cards de Premiação do Bolão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card do Prêmio Total */}
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-600/40 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Prêmio Total do Bolão
            </span>
            <Trophy size={20} className="text-emerald-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none text-white">
              R$ {totalPremioBolao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-300 mt-1.5 font-medium">
              {totalPremioBolao > 0 && totalCotasPagas > 0
                ? `R$ ${(totalPremioBolao / totalCotasPagas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por cota paga`
                : 'Aguardando divulgação dos números oficiais'}
            </div>
          </div>
          {totalPremioBolao > 0 && (
            <button
              type="button"
              onClick={dispararConfetes}
              className="mt-1 w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Celebrar Premiação do Grupo</span>
            </button>
          )}
        </div>

        {/* Senas */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Senas (6 acertos)</span>
            <Sparkles size={16} className="text-amber-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {totalSenas}
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
              R$ {premios.sena.toLocaleString('pt-BR')} cada
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Prêmio principal da Virada</span>
        </div>

        {/* Quinas */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Quinas (5 acertos)</span>
            <CheckCircle2 size={16} className="text-blue-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {totalQuinas}
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold block mt-0.5">
              R$ {premios.quina.toLocaleString('pt-BR')} cada
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Inclui múltiplos de desdobramento</span>
        </div>

        {/* Quadras */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Quadras (4 acertos)</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {totalQuadras}
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
              R$ {premios.quadra.toLocaleString('pt-BR')} cada
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Inclui múltiplos de desdobramento</span>
        </div>
      </div>

      {/* Lista de Jogos Conferidos com Destaque Visual */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Desempenho dos Jogos ({jogosConferidos.length})
            </h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400 font-medium">
              Conferência ao vivo
            </span>
          </div>
          <span className="text-xs text-slate-400">Acertos destacados em verde</span>
        </div>

        <div className="space-y-3">
          {jogosConferidos.map((j, idx) => {
            const ehPremiado = j.premiacaoCalculada.valorTotal > 0;
            return (
              <div
                key={j.jogoId}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  ehPremiado
                    ? 'border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                      Jogo #{idx + 1}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({j.dezenas.length} dezenas jogadas)
                    </span>
                    {ehPremiado && (
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
                        Premiado!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold">
                      Acertos:{' '}
                      <strong className={j.totalAcertos >= 4 ? 'text-emerald-600 font-black text-sm' : 'text-slate-600 dark:text-slate-400'}>
                        {j.totalAcertos}
                      </strong>
                      {ehPremiado && (
                        <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold">
                          (+ R$ {j.premiacaoCalculada.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTicket({
                          open: true,
                          imageUrl: j.foto_url,
                          gameIndex: idx + 1,
                          dezenas: j.dezenas,
                          codigo: jogos[idx]?.codigo_bilhete,
                        })
                      }
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg transition hover:shadow-xs"
                    >
                      <Receipt size={13} />
                      <span>Ver Bilhete</span>
                    </button>
                  </div>
                </div>

                {/* Bolinhas das Dezenas com destaque nas acertadas */}
                <div className="flex flex-wrap gap-1.5">
                  {j.dezenas.map((num) => {
                    const acertou = j.acertos.includes(num);
                    return (
                      <span
                        key={num}
                        className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                          acertou
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 scale-105 shadow-xs font-black'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {num < 10 ? `0${num}` : num}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela de Repasse Financeiro por Cotista */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Coins size={18} className="text-amber-500" />
              <span>Tabela de Repasse Financeiro por Cotista</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rateio rigorosamente restrito aos cotistas com status "Pago" ({totalCotasPagas} cotas pagas).
            </p>
          </div>

          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Total a Repassar: R$ {totalPremioBolao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Participante</th>
                <th className="py-3 px-3 text-center">Cotas Pagas</th>
                <th className="py-3 px-3 text-right">Participação</th>
                <th className="py-3 px-4 text-right">Valor a Receber</th>
                <th className="py-3 px-4 text-center">Notificar WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {rateio.map((p) => {
                const isPago = p.status_pagamento === 'Pago';
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition ${
                      !isPago ? 'opacity-50 bg-slate-50/40 dark:bg-slate-900/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{p.nome}</span>
                        {!isPago && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full font-bold">
                            Pendente
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal font-mono">{p.telefone}</div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-900 dark:text-slate-100">
                      {isPago ? p.qtd_cotas : 0}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                      {isPago ? `${p.porcentagem.toFixed(1)}%` : '0.0%'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700 dark:text-emerald-400 text-sm font-mono tabular-nums">
                      R$ {p.valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => enviarWhatsAppCotista(p)}
                        disabled={!isPago || p.valorAReceber === 0}
                        aria-label={`Enviar mensagem WhatsApp para ${p.nome}`}
                        className="p-2 rounded-xl text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 disabled:opacity-30 disabled:cursor-not-allowed transition inline-flex items-center justify-center"
                        title={isPago && p.valorAReceber > 0 ? 'Enviar WhatsApp com valor do prêmio' : 'Sem premiação'}
                      >
                        <Smartphone size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Comprovante Oficial */}
      <TicketViewerModal
        isOpen={selectedTicket.open}
        onClose={() => setSelectedTicket({ ...selectedTicket, open: false })}
        imageUrl={selectedTicket.imageUrl}
        gameIndex={selectedTicket.gameIndex}
        dezenas={selectedTicket.dezenas}
        codigoBilhete={selectedTicket.codigo}
      />
    </div>
  );
};
