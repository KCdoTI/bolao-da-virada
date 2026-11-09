import React, { useState, useEffect } from 'react';
import {
  Users,
  Ticket,
  Trophy,
  PlusCircle,
  Share2,
  Sparkles,
  RefreshCw,
  Printer,
  Brain,
} from 'lucide-react';
import { Bolao, Participante, Jogo } from './types';
import { mockBolao, mockParticipantes, mockJogos } from './mocks/initialData';
import { DashboardHeader } from './components/DashboardHeader';
import { FinancialSummary } from './components/FinancialSummary';
import { ShareBar } from './components/ShareBar';
import { ParticipantList } from './components/ParticipantList';
import { GamesList } from './components/GamesList';
import { PainelConferencia } from './components/PainelConferencia';
import { PublicTransparencyView } from './components/PublicTransparencyView';
import { VolanteModal } from './components/VolanteModal';
import { AddParticipantModal } from './components/AddParticipantModal';
import { AiStrategyModal } from './components/AiStrategyModal';
import { PrintReportModal } from './components/PrintReportModal';
import { LegalFaqModal } from './components/LegalFaqModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  // Estado com persistência em LocalStorage
  const [bolao, setBolao] = useState<Bolao>(() => {
    try {
      const saved = localStorage.getItem('bolao_da_virada_info');
      return saved ? JSON.parse(saved) : mockBolao;
    } catch {
      return mockBolao;
    }
  });

  const [participantes, setParticipantes] = useState<Participante[]>(() => {
    try {
      const saved = localStorage.getItem('bolao_da_virada_participantes');
      return saved ? JSON.parse(saved) : mockParticipantes;
    } catch {
      return mockParticipantes;
    }
  });

  const [jogos, setJogos] = useState<Jogo[]>(() => {
    try {
      const saved = localStorage.getItem('bolao_da_virada_jogos');
      return saved ? JSON.parse(saved) : mockJogos;
    } catch {
      return mockJogos;
    }
  });

  const [dezenasSorteadas, setDezenasSorteadas] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('bolao_da_virada_sorteadas');
      return saved ? JSON.parse(saved) : (mockBolao.dezenas_sorteadas || [5, 10, 18, 34, 42, 59]);
    } catch {
      return [5, 10, 18, 34, 42, 59];
    }
  });

  // Visão Ativa: 'organizador' vs 'publico' (Link de transparência do cotista)
  const [activeView, setActiveView] = useState<'organizador' | 'publico'>('organizador');

  // Aba ativa no Painel do Organizador
  const [activeTab, setActiveTab] = useState<'participantes' | 'jogos' | 'conferencia'>('participantes');

  // Modais
  const [isVolanteOpen, setIsVolanteOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isAiStrategyOpen, setIsAiStrategyOpen] = useState(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  // Dezenas sugeridas pela IA para carregar no volante
  const [prefilledDezenas, setPrefilledDezenas] = useState<number[]>([]);

  // Notificações Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'info' | 'warning', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Salvar no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('bolao_da_virada_info', JSON.stringify(bolao));
      localStorage.setItem('bolao_da_virada_participantes', JSON.stringify(participantes));
      localStorage.setItem('bolao_da_virada_jogos', JSON.stringify(jogos));
      localStorage.setItem('bolao_da_virada_sorteadas', JSON.stringify(dezenasSorteadas));
    } catch (e) {
      console.error('Falha ao sincronizar com localStorage:', e);
    }
  }, [bolao, participantes, jogos, dezenasSorteadas]);

  // Aplica classe dark ao html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Verifica Hash na URL (ex: #b-virada-2026-x9k2) para carregar direto como participante
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash && (hash.startsWith('#b-') || hash.includes('participante') || hash.includes('/b/'))) {
        setActiveView('publico');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Handlers de Participantes
  const handleToggleStatus = (id: string) => {
    setParticipantes((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const novoStatus = p.status_pagamento === 'Pago' ? 'Pendente' : 'Pago';
          addToast(
            'success',
            `Status de ${p.nome} atualizado!`,
            `Marcado como ${novoStatus}. Cotas e rateio recalculados.`
          );
          return { ...p, status_pagamento: novoStatus };
        }
        return p;
      })
    );
  };

  const handleAddParticipant = (novo: Omit<Participante, 'id'>) => {
    const criado: Participante = {
      ...novo,
      id: `p-${Date.now()}`,
    };
    setParticipantes((prev) => [criado, ...prev]);
    addToast('success', 'Participante adicionado!', `${criado.nome} cadastrado com ${criado.qtd_cotas} cota(s).`);
  };

  const handleRemoveParticipant = (id: string) => {
    const part = participantes.find((p) => p.id === id);
    if (window.confirm(`Tem certeza que deseja remover ${part?.nome || 'este participante'} do bolão?`)) {
      setParticipantes((prev) => prev.filter((p) => p.id !== id));
      addToast('info', 'Participante removido', 'O rateio foi recalculado.');
    }
  };

  // Handlers de Jogos
  const handleAddJogo = (novo: Omit<Jogo, 'id' | 'criado_em'>) => {
    const criado: Jogo = {
      ...novo,
      id: `game-${Date.now()}`,
      criado_em: new Date().toISOString().split('T')[0],
      codigo_bilhete: novo.codigo_bilhete || `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    setJogos((prev) => [criado, ...prev]);
    setActiveTab('jogos');
    setPrefilledDezenas([]);
    addToast('success', 'Novo Jogo Registrado!', `Aposta com ${criado.dezenas.length} dezenas salva com sucesso.`);
  };

  const handleRemoveJogo = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta aposta?')) {
      setJogos((prev) => prev.filter((j) => j.id !== id));
      addToast('info', 'Aposta excluída', 'O conferidor foi atualizado.');
    }
  };

  const handleApplyAiDezenas = (dezenas: number[]) => {
    setPrefilledDezenas(dezenas);
    setIsVolanteOpen(true);
    addToast('success', 'Estratégia IA Aplicada!', `${dezenas.length} dezenas carregadas no volante.`);
  };

  // Restaura dados de fábrica
  const handleResetData = () => {
    if (window.confirm('Deseja restaurar os dados originais de demonstração da Mega da Virada 2026?')) {
      setBolao(mockBolao);
      setParticipantes(mockParticipantes);
      setJogos(mockJogos);
      setDezenasSorteadas(mockBolao.dezenas_sorteadas || [5, 10, 18, 34, 42, 59]);
      addToast('info', 'Dados restaurados', 'Carregados dados oficiais de demonstração.');
    }
  };

  // Se a visão ativa for a Pública (Transparência do Cotista)
  if (activeView === 'publico') {
    return (
      <>
        <PublicTransparencyView
          bolao={bolao}
          participantes={participantes}
          jogos={jogos}
          dezenasSorteadas={dezenasSorteadas}
          onBackToDashboard={() => setActiveView('organizador')}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  // Visão do Painel do Organizador
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-24 transition-colors">
      {/* Header com 3 Zonas Estritas */}
      <DashboardHeader
        bolao={bolao}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenNovoJogo={() => {
          setPrefilledDezenas([]);
          setIsVolanteOpen(true);
        }}
        onOpenAiConsultant={() => setIsAiStrategyOpen(true)}
        onOpenPrintReport={() => setIsPrintReportOpen(true)}
        onOpenLegalModal={() => setIsLegalModalOpen(true)}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
      />

      {/* Conteúdo Principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8">
        {/* Painel Financeiro (KPIs) */}
        <FinancialSummary
          bolao={bolao}
          participantes={participantes}
          jogos={jogos}
        />

        {/* Barra de Compartilhamento do Link de Transparência */}
        <ShareBar
          bolao={bolao}
          participantes={participantes}
          jogos={jogos}
          onOpenPublicView={() => setActiveView('publico')}
        />

        {/* Abas de Navegação do Painel com Escala Ergonômica */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          {/* Segmented Control de Abas */}
          <div className="flex items-center p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl self-stretch sm:self-start border border-slate-300/60 dark:border-slate-700 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('participantes')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'participantes'
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users size={15} />
              <span>Participantes ({participantes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('jogos')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'jogos'
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Ticket size={15} />
              <span>Jogos ({jogos.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('conferencia')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'conferencia'
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy size={15} className="text-amber-500" />
              <span>Conferência</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setIsAiStrategyOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-xl shadow-xs transition-all duration-150 active:scale-[0.98]"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Estratégia IA</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintReportOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all duration-150 active:scale-[0.98]"
              title="Gerar extrato oficial em PDF/Impressão"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Extrato</span>
            </button>

            <button
              type="button"
              onClick={handleResetData}
              aria-label="Restaurar dados de teste"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors"
              title="Restaurar dados de demonstração"
            >
              <RefreshCw size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                setPrefilledDezenas([]);
                setIsVolanteOpen(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold text-xs py-2 px-4 min-h-[40px] rounded-xl shadow-xs transition-all duration-150 whitespace-nowrap"
            >
              <PlusCircle size={15} />
              <span>Novo Jogo</span>
            </button>
          </div>
        </div>

        {/* Conteúdo da Aba Ativa */}
        {activeTab === 'participantes' && (
          <ParticipantList
            bolao={bolao}
            participantes={participantes}
            onToggleStatus={handleToggleStatus}
            onRemoveParticipante={handleRemoveParticipant}
            onOpenAddModal={() => setIsAddParticipantOpen(true)}
          />
        )}

        {activeTab === 'jogos' && (
          <GamesList
            jogos={jogos}
            onOpenNovoJogo={() => {
              setPrefilledDezenas([]);
              setIsVolanteOpen(true);
            }}
            onRemoveJogo={handleRemoveJogo}
            onOpenAiConsultant={() => setIsAiStrategyOpen(true)}
          />
        )}

        {activeTab === 'conferencia' && (
          <PainelConferencia
            bolaoNome={bolao.nome}
            concursoNumero={bolao.concurso_numero}
            chavePixOrganizador={bolao.chave_pix_organizador}
            jogos={jogos}
            participantes={participantes}
            dezenasSorteadas={dezenasSorteadas}
            onUpdateDezenasSorteadas={setDezenasSorteadas}
          />
        )}
      </main>

      {/* Modais Globais */}
      <VolanteModal
        isOpen={isVolanteOpen}
        onClose={() => setIsVolanteOpen(false)}
        onSaveJogo={handleAddJogo}
        bolaoId={bolao.id}
        initialDezenas={prefilledDezenas}
      />

      <AddParticipantModal
        isOpen={isAddParticipantOpen}
        onClose={() => setIsAddParticipantOpen(false)}
        onAdd={handleAddParticipant}
        bolaoId={bolao.id}
        valorCota={bolao.valor_cota}
      />

      <AiStrategyModal
        isOpen={isAiStrategyOpen}
        onClose={() => setIsAiStrategyOpen(false)}
        jogos={jogos}
        onApplyToVolante={handleApplyAiDezenas}
      />

      <PrintReportModal
        isOpen={isPrintReportOpen}
        onClose={() => setIsPrintReportOpen(false)}
        bolao={bolao}
        participantes={participantes}
        jogos={jogos}
      />

      <LegalFaqModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
