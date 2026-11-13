import React, { useState, useEffect } from 'react';
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
  MessageCircle,
  QrCode,
  UserCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Bolao, Participante, Jogo } from '../types';
import { maskPhone, buildWhatsAppProofSubmissionUrl } from '../utils/transparency';
import { conferirJogo, calcularRateio } from '../utils/lotteryEngine';
import { TicketViewerModal } from './TicketViewerModal';
import { LegalFaqModal } from './LegalFaqModal';
import { BrandLogo } from './BrandLogo';
import { getModalidadeInfo } from '../constants/lotteryCatalog';

interface PublicTransparencyViewProps {
  bolao: Bolao;
  participantes: Participante[];
  jogos: Jogo[];
  dezenasSorteadas: number[];
  initialParticipantToken?: string | null;
  onBackToDashboard: () => void;
}

export const PublicTransparencyView: React.FC<PublicTransparencyViewProps> = ({
  bolao,
  participantes,
  jogos,
  dezenasSorteadas,
  initialParticipantToken,
  onBackToDashboard,
}) => {
  const [pixCopied, setPixCopied] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(() => {
    if (initialParticipantToken) {
      const match = participantes.find(
        (p) => p.token_acesso === initialParticipantToken || p.id === initialParticipantToken
      );
      if (match) return match.id;
    }
    return null;
  });

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

  // Atualiza se houver hash na URL tipo #cota-cot_mariana
  useEffect(() => {
    const handleUrlToken = () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const token = params.get('cota') || (hash.includes('cota-') ? hash.split('cota-')[1] : null);

      if (token) {
        const found = participantes.find((p) => p.token_acesso === token || p.id === token);
        if (found) {
          setSelectedParticipantId(found.id);
        }
      }
    };
    handleUrlToken();
    window.addEventListener('hashchange', handleUrlToken);
    return () => window.removeEventListener('hashchange', handleUrlToken);
  }, [participantes]);

  const currentParticipant = participantes.find((p) => p.id === selectedParticipantId) || null;

  const isSorteado = dezenasSorteadas && dezenasSorteadas.length === 6;

  // Cotas e Totais
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
          <span>Transparência Oficial dos Participantes • Acesso Seguro Read-Only</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLegalModalOpen(true)}
            className="text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-800 transition flex items-center gap-1 cursor-pointer"
            title="Como funciona a legalidade e as regras da Caixa"
          >
            <Scale size={12} />
            <span>Regras & Legalidade</span>
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-800 transition flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={12} />
            <span>Painel do Organizador</span>
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
                {(() => {
                  const infoMod = getModalidadeInfo(bolao.modalidade);
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 ${infoMod.estilo.badgeBg} ${infoMod.estilo.badgeText} border ${infoMod.estilo.badgeBorder} text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        infoMod.isEspecial ? 'animate-pulse' : ''
                      }`}
                    >
                      <span>{infoMod.icone}</span>
                      {infoMod.isEspecial ? infoMod.edicaoEspecialNome || infoMod.nome : infoMod.nome}
                    </span>
                  );
                })()}
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
            Acompanhe a arrecadação das cotas, visualize os bilhetes autenticados pela Caixa e confira a apuração oficial dos prêmios em tempo real.
          </p>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-2">
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800 min-w-0">
              <span className="text-slate-400 text-[11px] block font-medium uppercase tracking-wider">Valor da Cota</span>
              <strong className="text-base sm:text-lg text-emerald-400 font-extrabold font-mono tabular-nums block mt-0.5 truncate">
                R$ {bolao.valor_cota.toFixed(2)}
              </strong>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800 min-w-0">
              <span className="text-slate-400 text-[11px] block font-medium uppercase tracking-wider">Cotas Confirmadas</span>
              <strong className="text-base sm:text-lg text-white font-extrabold font-mono tabular-nums block mt-0.5 truncate">
                {cotasPagas}{' '}
                <span className="text-xs text-slate-400 font-normal">/ {totalCotas}</span>
              </strong>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800 min-w-0">
              <span className="text-slate-400 text-[11px] block font-medium uppercase tracking-wider">Prazo Lotérica</span>
              <strong className="text-xs sm:text-sm text-slate-200 font-bold block mt-1 truncate">
                {dataFmt} {horaFmt}
              </strong>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between min-w-0">
              <div className="min-w-0 pr-1.5">
                <span className="text-slate-400 text-[11px] block font-medium uppercase tracking-wider">PIX do Organizador</span>
                <span className="text-xs font-mono font-bold text-slate-200 truncate block mt-0.5" title={bolao.chave_pix_organizador}>
                  {bolao.chave_pix_organizador}
                </span>
              </div>
              <button
                type="button"
                onClick={copyPix}
                aria-label="Copiar chave PIX"
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-150 active:scale-95 shrink-0 cursor-pointer"
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
        {/* SEÇÃO 0: PAINEL PERSONALIZADO DO COTISTA (QUANDO ACESSADO VIA LINK INDIVIDUAL) */}
        {currentParticipant && (
          <section
            aria-label="Sua Cota Pessoal"
            className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-lg">
                  {currentParticipant.nome.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Painel Exclusivo do Cotista</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Olá, {currentParticipant.nome}!
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                    currentParticipant.status_pagamento === 'Pago'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                      : 'bg-amber-950 text-amber-300 border-amber-700/80'
                  }`}
                >
                  {currentParticipant.status_pagamento === 'Pago' ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Cota Confirmada & Paga</span>
                    </>
                  ) : (
                    <>
                      <Clock size={14} className="text-amber-400" />
                      <span>Aguardando Confirmação PIX</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Detalhes Financeiros da Cota do Participante */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 text-center sm:text-left">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 text-xs block font-medium">Suas Cotas</span>
                <strong className="text-xl font-black text-white font-mono">
                  {currentParticipant.qtd_cotas} {currentParticipant.qtd_cotas === 1 ? 'cota' : 'cotas'}
                </strong>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 text-xs block font-medium">Valor Total da Sua Cota</span>
                <strong className="text-xl font-black text-emerald-400 font-mono">
                  R$ {(currentParticipant.qtd_cotas * bolao.valor_cota).toFixed(2)}
                </strong>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 text-xs block font-medium">Participação no Prêmio</span>
                <strong className="text-xl font-black text-amber-400 font-mono">
                  {cotasPagas > 0 && currentParticipant.status_pagamento === 'Pago'
                    ? `${((currentParticipant.qtd_cotas / cotasPagas) * 100).toFixed(1)}%`
                    : `${((currentParticipant.qtd_cotas / totalCotas) * 100).toFixed(1)}%`}
                </strong>
              </div>
            </div>

            {/* Ações Específicas por Status */}
            {currentParticipant.status_pagamento === 'Pendente' ? (
              <div className="mt-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                <div className="text-xs text-amber-200">
                  <strong>Atenção:</strong> Sua cota ainda não foi confirmada pelo organizador. Realize o PIX diretamente para os dados abaixo e envie o comprovante:
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Chave PIX do Organizador ({bolao.nome_organizador || 'Kelvin Castro'}):</span>
                    <span className="text-sm font-mono font-bold text-white select-all">
                      {bolao.chave_pix_organizador}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyPix}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      {pixCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{pixCopied ? 'Chave Copiada!' : 'Copiar PIX'}</span>
                    </button>
                    <a
                      href={buildWhatsAppProofSubmissionUrl(
                        bolao.chave_pix_organizador.includes('@') ? '' : bolao.chave_pix_organizador,
                        currentParticipant.nome,
                        bolao.nome,
                        currentParticipant.qtd_cotas,
                        currentParticipant.qtd_cotas * bolao.valor_cota
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                    >
                      <MessageCircle size={15} />
                      <span>Enviar Comprovante</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-xs text-emerald-300">
                <Check size={18} className="text-emerald-400 shrink-0" />
                <span>
                  Tudo certo! Seu pagamento foi validado pelo organizador. Você está oficialmente concorrendo a todas as apostas registradas abaixo.
                </span>
              </div>
            )}
          </section>
        )}

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
                  Resultado Oficial da {bolao.modalidade} #{bolao.concurso_numero}
                </h2>
              </div>
              <span className="text-[11px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full">
                Sorteio Concluído
              </span>
            </div>

            {/* Bolas Sorteadas */}
            <div className="py-5 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Dezenas Sorteadas pela Caixa
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
                <span className="text-xs text-slate-400 font-medium">Prêmio Total Conquistado pelo Bolão:</span>
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
                Jogos Oficiais Registrados ({jogos.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {jogos.reduce((acc, j) => acc + j.dezenas.length, 0)} dezenas marcadas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {jogos.map((jogo, index) => {
              const acertos = isSorteado
                ? jogo.dezenas.filter((d) => dezenasSorteadas.includes(d))
                : [];

              return (
                <div
                  key={jogo.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Jogo #{index + 1}</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {jogo.dezenas.length} dezenas
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {jogo.dezenas.map((dezena) => {
                      const hit = acertos.includes(dezena);
                      return (
                        <span
                          key={dezena}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono transition-colors ${
                            hit
                              ? 'bg-amber-400 text-slate-950 shadow-sm ring-2 ring-amber-300 font-black'
                              : 'bg-slate-800 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {dezena < 10 ? `0${dezena}` : dezena}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-500 font-mono">
                      {jogo.codigo_bilhete ? `Controle: ${jogo.codigo_bilhete}` : 'Autenticado'}
                    </span>
                    {jogo.foto_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalFoto({
                            open: true,
                            imageUrl: jogo.foto_url,
                            index: index + 1,
                            dezenas: jogo.dezenas,
                            codigo: jogo.codigo_bilhete,
                          })
                        }
                        className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Receipt size={13} />
                        <span>Ver Comprovante</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SEÇÃO 3: LISTA DE COTISTAS (TRANSPARÊNCIA + LGPD SEM EXPOSIÇÃO DE PENDÊNCIAS) */}
        <section aria-label="Lista de Cotistas" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-emerald-400" />
              <h2 className="font-bold text-sm sm:text-base text-white">
                Quadro Coletivo de Participantes ({participantes.length})
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>{cotasPagas} de {totalCotas} cotas confirmadas</span>
            </div>
          </div>

          <div className="divide-y divide-slate-800 mt-2">
            {participantes.map((p) => {
              const isPago = p.status_pagamento === 'Pago';
              const cotistaRateio = rateio.find((r) => r.id === p.id);
              const isMe = currentParticipant?.id === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedParticipantId(p.id)}
                  className={`py-3 px-2 flex items-center justify-between gap-3 rounded-xl transition cursor-pointer ${
                    isMe
                      ? 'bg-emerald-950/40 border border-emerald-700/50'
                      : 'hover:bg-slate-800/40'
                  }`}
                  title="Clique para ver detalhes desta cota"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                      <span>{p.nome}</span>
                      {isMe && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded-md">
                          Você
                        </span>
                      )}
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

                    {/* Proteção Ética: Mostra apenas se confirmado, sem rotular negativamente os pendentes */}
                    {isPago ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                        <Check size={11} />
                        <span>Confirmado</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 text-slate-500 bg-slate-800/60 rounded-full border border-slate-700/40">
                        Em reserva
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SEÇÃO 4: REGRAS E POLÍTICA DE CONTINGÊNCIA */}
        <section aria-label="Regras do Bolão" className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-3">
          <h3 className="font-bold text-slate-300 text-sm flex items-center gap-1.5">
            <Info size={15} className="text-emerald-400" />
            <span>Regras e Transparência do Bolão</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-400">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-slate-300 block mb-1">Regra de Downgrade Automático:</strong>
              <p>
                {bolao.regra_downgrade === 'diminuir_dezenas'
                  ? 'Caso haja cotas não quitadas até o prazo final, o organizador reduz o desdobramento preservando o núcleo de números.'
                  : bolao.regra_downgrade === 'devolver_excedente'
                  ? 'Caso a arrecadação divirja da meta, cotas excedentes serão estornadas proporcionalmente via PIX.'
                  : 'Caso a arrecadação não atinja 100%, são cortados os jogos satélites de 6 dezenas mantendo a aposta desdobrada principal intacta.'}
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-slate-300 block mb-1">Horário & Fechamento de Apostas:</strong>
              <p>
                O encerramento de pagamentos ocorre com margem de segurança antes do fechamento oficial da lotérica ({bolao.horario_limite_loterica || '18:00'}).
              </p>
            </div>
          </div>

          {bolao.regras && bolao.regras.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-slate-400 pt-1">
              {bolao.regras.map((regra, i) => (
                <li key={i}>{regra}</li>
              ))}
            </ul>
          )}
        </section>
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
