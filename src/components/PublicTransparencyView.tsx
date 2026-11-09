import React, { useState } from 'react';
import {
  Trophy,
  ShieldCheck,
  Copy,
  Check,
  Ticket,
  Users,
  Sparkles,
  Calendar,
  Receipt,
  DollarSign,
  ArrowLeft,
  Lock,
  Eye,
  Info,
  Scale,
} from 'lucide-react';
import { Bolao, Participante, Jogo } from '../types';
import { maskPhone } from '../utils/transparency';
import { conferirJogo, calcularRateio } from '../utils/lotteryEngine';
import { TicketViewerModal } from './TicketViewerModal';
import { LegalFaqModal } from './LegalFaqModal';
import { BrandLogo } from './BrandLogo';

interface PublicTransparencyViewProps {
  bolao: Bolao;
  participantes: Participante[];
  jogos: Jogo[];
  dezenasSorteadas: number[];
  onBackToDashboard: () => void;
}

export const PublicTransparencyView: React.FC<PublicTransparencyViewProps> = ({
  bolao,
  participantes,
  jogos,
  dezenasSorteadas,
  onBackToDashboard,
}) => {
  const [pixCopied, setPixCopied] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [modalFoto, setModalFoto] = useState<{
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

  const isSorteado = dezenasSorteadas && dezenasSorteadas.length === 6;

  // Cotas
  const cotasPagas = participantes
    .filter((p) => p.status_pagamento === 'Pago')
    .reduce((acc, p) => acc + p.qtd_cotas, 0);
  const totalCotas = participantes.reduce((acc, p) => acc + p.qtd_cotas, 0);

  // Apuração
  const premiosFaixas = { sena: 550000000, quina: 70000, quadra: 1200 };
  const jogosConferidos = jogos.map((j) => conferirJogo(j, dezenasSorteadas, premiosFaixas));
  const totalPremioBolao = jogosConferidos.reduce(
    (acc, j) => acc + j.premiacaoCalculada.valorTotal,
    0
  );
  const rateio = calcularRateio(participantes, totalPremioBolao);

  const copyPix = () => {
    navigator.clipboard.writeText(bolao.chave_pix_organizador);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2200);
  };

  const dataFmt = new Date(bolao.data_limite).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFmt = new Date(bolao.data_limite).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 antialiased">
      {/* Barra de Transparência / Topo */}
      <div className="bg-emerald-950 border-b border-emerald-900/60 px-4 py-2.5 text-center text-xs text-emerald-300 font-medium flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <span>Página Pública de Transparência dos Participantes • Acesso Read-Only</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLegalModalOpen(true)}
            className="text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-800 transition flex items-center gap-1"
            title="Como funciona a legalidade e as regras da Caixa"
          >
            <Scale size={12} />
            <span>Regras & Legalidade</span>
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-800 transition flex items-center gap-1"
          >
            <ArrowLeft size={12} />
            <span>Voltar ao Painel</span>
          </button>
        </div>
      </div>

      {/* Header do Bolão Público */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-6 sm:py-8 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3.5">
            <BrandLogo size={36} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {bolao.modalidade}
                </span>
                <span className="text-xs font-mono text-slate-400">Concurso #{bolao.concurso_numero}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                    isSorteado
                      ? 'bg-purple-950 text-purple-300 border border-purple-800/80'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                  }`}
                >
                  {isSorteado ? 'Sorteio Realizado' : 'Apostas Abertas'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                {bolao.nome}
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Acompanhe em tempo real a arrecadação das cotas, veja os bilhetes autenticados pela Caixa e confira o rateio oficial dos prêmios.
          </p>

          {/* Cards de Destaque para o Cotista */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block font-medium">Valor da Cota</span>
              <strong className="text-lg text-emerald-400 font-extrabold font-mono tabular-nums">
                R$ {bolao.valor_cota.toFixed(2)}
              </strong>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block font-medium">Cotas Confirmadas</span>
              <strong className="text-lg text-white font-extrabold font-mono tabular-nums">
                {cotasPagas}{' '}
                <span className="text-xs text-slate-400 font-normal">/ {totalCotas}</span>
              </strong>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block font-medium">Data Limite</span>
              <strong className="text-xs text-slate-200 font-bold block mt-1">
                {dataFmt} {horaFmt}
              </strong>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <span className="text-slate-400 text-[11px] block font-medium">PIX do Bolão</span>
                <span className="text-xs font-mono font-bold text-slate-200 truncate block">
                  {bolao.chave_pix_organizador}
                </span>
              </div>
              <button
                type="button"
                onClick={copyPix}
                aria-label="Copiar chave PIX"
                className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-90 shrink-0"
                title="Copiar chave PIX"
              >
                {pixCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* SEÇÃO 1: AO VIVO / RESULTADO APÓS O SORTEIO */}
        {isSorteado && (
          <section
            aria-label="Resultado do Sorteio"
            className="bg-gradient-to-b from-emerald-950/70 to-slate-900 border border-emerald-800/60 rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/60">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-amber-400" />
                <h2 className="font-extrabold text-sm sm:text-base text-white">
                  Resultado Oficial da Mega da Virada #{bolao.concurso_numero}
                </h2>
              </div>
              <span className="text-[11px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full">
                Sorteio Concluído
              </span>
            </div>

            {/* Bolas Sorteadas */}
            <div className="py-5 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Dezenas Sorteadas
              </span>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {dezenasSorteadas.map((num) => (
                  <span
                    key={num}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg ring-3 ring-emerald-300"
                  >
                    {num < 10 ? `0${num}` : num}
                  </span>
                ))}
              </div>
            </div>

            {/* Placar Acumulado do Bolão */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <span className="text-xs text-slate-400 font-medium">Prêmio Acumulado pelo Nosso Bolão:</span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
                  R$ {totalPremioBolao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {totalPremioBolao > 0 && cotasPagas > 0 && (
                <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Valor por Cota Paga:</span>
                  <div className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
                    R$ {(totalPremioBolao / cotasPagas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SEÇÃO 2: JOGOS REGISTRADOS NA LOTÉRICA */}
        <section aria-label="Jogos Registrados" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Ticket size={18} className="text-emerald-400" />
              <h2 className="font-bold text-sm sm:text-base text-white">
                Jogos Registrados na Lotérica ({jogos.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400">Comprovantes Auditáveis</span>
          </div>

          <div className="space-y-3">
            {jogosConferidos.map((jogo, index) => {
              const ehPremiado = jogo.premiacaoCalculada.valorTotal > 0;
              return (
                <div
                  key={jogo.jogoId}
                  className={`p-4 rounded-xl border transition ${
                    ehPremiado
                      ? 'bg-emerald-950/20 border-emerald-500/50 shadow-xs'
                      : 'bg-slate-800/40 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-200">
                        Jogo #{jogos.length - index}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({jogo.dezenas.length} números)
                      </span>
                      {ehPremiado && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                          Premiado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isSorteado && (
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            ehPremiado
                              ? 'bg-emerald-400 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {jogo.totalAcertos} {jogo.totalAcertos === 1 ? 'acerto' : 'acertos'}
                        </span>
                      )}

                      {/* Botão Ver Foto do Bilhete */}
                      <button
                        type="button"
                        onClick={() =>
                          setModalFoto({
                            open: true,
                            imageUrl: jogos[index].foto_url,
                            index: jogos.length - index,
                            dezenas: jogo.dezenas,
                            codigo: jogos[index]?.codigo_bilhete,
                          })
                        }
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/70 px-3 py-1.5 rounded-lg transition hover:bg-emerald-900/60 active:scale-95"
                      >
                        <Receipt size={14} />
                        <span>Ver Bilhete Oficial</span>
                      </button>
                    </div>
                  </div>

                  {/* Dezenas com destaque caso sorteadas */}
                  <div className="flex flex-wrap gap-1.5">
                    {jogo.dezenas.map((num) => {
                      const acertou = isSorteado && jogo.acertos.includes(num);
                      return (
                        <span
                          key={num}
                          className={`w-8 h-8 rounded-full text-xs font-extrabold flex items-center justify-center transition ${
                            acertou
                              ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 font-black shadow-sm'
                              : 'bg-slate-800 text-slate-300'
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
        </section>

        {/* SEÇÃO 3: LISTA DE COTISTAS (TRANSPARÊNCIA + LGPD) */}
        <section aria-label="Lista de Cotistas" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-emerald-400" />
              <h2 className="font-bold text-sm sm:text-base text-white">
                Lista de Cotistas ({participantes.length})
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <Lock size={12} className="text-emerald-500" />
              <span>Privacidade LGPD (telefones ofuscados)</span>
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {participantes.map((p) => {
              const isPago = p.status_pagamento === 'Pago';
              const cotistaRateio = rateio.find((r) => r.id === p.id);

              return (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-slate-200 leading-snug">
                      {p.nome}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {maskPhone(p.telefone)}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-300">
                        {p.qtd_cotas} {p.qtd_cotas === 1 ? 'cota' : 'cotas'}
                      </div>
                      {isSorteado && isPago && cotistaRateio && cotistaRateio.valorAReceber > 0 && (
                        <div className="text-xs font-black text-amber-400 mt-0.5 font-mono tabular-nums">
                          R$ {cotistaRateio.valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isPago
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/80'
                      }`}
                    >
                      {p.status_pagamento}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SEÇÃO 4: REGRAS E TRANSPARÊNCIA */}
        {bolao.regras && bolao.regras.length > 0 && (
          <section aria-label="Regras do Bolão" className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
            <h3 className="font-bold text-slate-300 text-sm flex items-center gap-1.5 mb-2">
              <Info size={15} className="text-emerald-400" />
              <span>Regras Oficiais deste Bolão</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1.5">
              {bolao.regras.map((regra, i) => (
                <li key={i}>{regra}</li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {/* Modal de Comprovante Oficial */}
      <TicketViewerModal
        isOpen={modalFoto.open}
        onClose={() => setModalFoto({ ...modalFoto, open: false })}
        imageUrl={modalFoto.imageUrl}
        gameIndex={modalFoto.index}
        dezenas={modalFoto.dezenas}
        codigoBilhete={modalFoto.codigo}
      />

      {/* Modal de Guia Legal e Regras */}
      <LegalFaqModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
};
