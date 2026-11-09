import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  Copy,
  Check,
  PlusCircle,
  Moon,
  Sun,
  Eye,
  Sparkles,
  Printer,
  Scale,
} from 'lucide-react';
import { Bolao } from '../types';

interface DashboardHeaderProps {
  bolao: Bolao;
  activeView: 'organizador' | 'publico';
  onChangeView: (view: 'organizador' | 'publico') => void;
  onOpenNovoJogo: () => void;
  onOpenAiConsultant: () => void;
  onOpenPrintReport: () => void;
  onOpenLegalModal: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  bolao,
  activeView,
  onChangeView,
  onOpenNovoJogo,
  onOpenAiConsultant,
  onOpenPrintReport,
  onOpenLegalModal,
  darkMode,
  onToggleTheme,
}) => {
  const [copiedPix, setCopiedPix] = React.useState(false);

  const copyPix = () => {
    navigator.clipboard.writeText(bolao.chave_pix_organizador);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <header className="bg-emerald-800 dark:bg-emerald-950 text-white border-b border-emerald-900 transition-colors">
      {/* Top Bar - 3 Zonas Estritas */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Zona 1: Marca / Nome */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-base shadow-sm">
            🍀
          </div>
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white whitespace-nowrap">
            Bolão da Virada
          </span>
        </div>

        {/* Zona 2: Seletor de Visão (Organizador vs Participante) */}
        <nav aria-label="Modo de Visualização" className="flex items-center p-1 bg-emerald-900/90 dark:bg-slate-900/90 rounded-xl border border-emerald-700/60">
          <button
            type="button"
            onClick={() => onChangeView('organizador')}
            aria-pressed={activeView === 'organizador'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeView === 'organizador'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Organizador</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('publico')}
            aria-pressed={activeView === 'publico'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeView === 'publico'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            <Eye size={14} />
            <span>Cotista (Público)</span>
          </button>
        </nav>

        {/* Zona 3: Ações e Ferramentas */}
        <div className="flex items-center gap-2 shrink-0">
          {activeView === 'organizador' && (
            <>
              <button
                type="button"
                onClick={onOpenAiConsultant}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-900 text-amber-300 border border-emerald-700/60 text-xs font-bold transition active:scale-95 shadow-xs"
                title="Consultor e Gerador de Jogos com IA"
              >
                <Sparkles size={14} />
                <span>Consultor IA</span>
              </button>

              <button
                type="button"
                onClick={onOpenPrintReport}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-900 text-emerald-200 hover:text-white border border-emerald-700/60 text-xs font-bold transition active:scale-95"
                title="Extrato oficial para impressão"
              >
                <Printer size={14} />
                <span>Extrato</span>
              </button>

              <button
                type="button"
                onClick={onOpenLegalModal}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-900 text-emerald-200 hover:text-white border border-emerald-700/60 text-xs font-bold transition active:scale-95"
                title="Regras, Licenciamento e Instalação PWA"
              >
                <Scale size={14} />
                <span>Regras & Legal</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 hover:text-white border border-emerald-700/50 transition"
            title="Alternar tema claro/escuro"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {activeView === 'organizador' && (
            <button
              type="button"
              onClick={onOpenNovoJogo}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-xs transition active:scale-95 whitespace-nowrap"
            >
              <PlusCircle size={15} />
              <span>Novo Jogo</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Strip de Contexto do Bolão (quando na visão do organizador) */}
      {activeView === 'organizador' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                {bolao.modalidade}
              </span>
              <span className="text-emerald-200 text-xs font-medium">
                Concurso Oficial #{bolao.concurso_numero}
              </span>
              <span className="text-emerald-200 text-xs font-medium">
                · Cota: R$ {bolao.valor_cota.toFixed(2)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
              {bolao.nome}
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={copyPix}
              aria-label="Copiar chave PIX do organizador"
              className="flex items-center gap-2 text-xs font-semibold bg-emerald-900/80 hover:bg-emerald-900 border border-emerald-700/60 py-2 px-3.5 rounded-xl transition active:scale-95 text-white shadow-xs"
            >
              {copiedPix ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
              <span>
                PIX: <strong className="font-mono">{bolao.chave_pix_organizador}</strong>
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
