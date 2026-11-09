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
  Calculator,
} from 'lucide-react';
import { Bolao } from '../types';
import { BrandLogo } from './BrandLogo';

interface DashboardHeaderProps {
  bolao: Bolao;
  activeView: 'organizador' | 'publico';
  onChangeView: (view: 'organizador' | 'publico') => void;
  onOpenNovoJogo: () => void;
  onOpenAiConsultant: () => void;
  onOpenPrintReport: () => void;
  onOpenLegalModal: () => void;
  onOpenSimulador?: () => void;
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
  onOpenSimulador,
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
    <header className="bg-slate-900 border-b border-slate-800 text-white transition-colors">
      {/* Top Bar - 3 Zonas com Distribuição Responsiva Calibrada */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Zona 1: Marca / Nome */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <BrandLogo size={36} />
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white block leading-tight">
                Bolão da Virada
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block">
                Gestão & Auditoria de Cotas
              </span>
            </div>
          </div>

          {/* Zona 2 (Desktop): Seletor de Visão */}
          <nav aria-label="Modo de Visualização" className="hidden sm:flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onChangeView('organizador')}
              aria-pressed={activeView === 'organizador'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap ${
                activeView === 'organizador'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard size={14} className={activeView === 'organizador' ? 'text-emerald-400' : 'text-slate-400'} />
              <span>Organizador</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeView('publico')}
              aria-pressed={activeView === 'publico'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap ${
                activeView === 'publico'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye size={14} className={activeView === 'publico' ? 'text-emerald-400' : 'text-slate-400'} />
              <span>Cotista (Público)</span>
            </button>
          </nav>

          {/* Zona 3: Ações e Ferramentas */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {activeView === 'organizador' && (
              <>
                {onOpenSimulador && (
                  <button
                    type="button"
                    onClick={onOpenSimulador}
                    className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-emerald-400 border border-slate-700/60 text-xs font-semibold transition-all duration-150 active:scale-[0.98]"
                    title="Planejador Pré-Bolão e Simulação de Cenários"
                  >
                    <Calculator size={14} />
                    <span>Planejador</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenAiConsultant}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 border border-slate-700/60 text-xs font-semibold transition-all duration-150 active:scale-[0.98] shadow-xs"
                  title="Consultor e Gerador de Jogos com IA"
                >
                  <Sparkles size={14} />
                  <span>Consultor IA</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenPrintReport}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition-all duration-150 active:scale-[0.98]"
                  title="Extrato oficial para impressão"
                >
                  <Printer size={14} />
                  <span>Extrato</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenLegalModal}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition-all duration-150 active:scale-[0.98]"
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
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50 transition-colors"
              title="Alternar tema claro/escuro"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {activeView === 'organizador' && (
              <button
                type="button"
                onClick={onOpenNovoJogo}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 min-h-[38px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all duration-150 active:scale-[0.98] whitespace-nowrap"
              >
                <PlusCircle size={15} />
                <span className="hidden xs:inline sm:inline">Novo Jogo</span>
                <span className="xs:hidden sm:hidden">Jogo</span>
              </button>
            )}
          </div>
        </div>

        {/* Zona 2 (Mobile): Seletor de Visão em linha cheia (touch target 44px) */}
        <nav aria-label="Modo de Visualização Mobile" className="sm:hidden grid grid-cols-2 gap-1 p-1 mt-2.5 bg-slate-950/90 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeView('organizador')}
            aria-pressed={activeView === 'organizador'}
            className={`flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all duration-150 ${
              activeView === 'organizador'
                ? 'bg-slate-800 text-white shadow-xs font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard size={15} className={activeView === 'organizador' ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Organizador</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('publico')}
            aria-pressed={activeView === 'publico'}
            className={`flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all duration-150 ${
              activeView === 'publico'
                ? 'bg-slate-800 text-white shadow-xs font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={15} className={activeView === 'publico' ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Cotista (Público)</span>
          </button>
        </nav>
      </div>

      {/* Hero Strip de Contexto do Bolão (quando na visão do organizador) */}
      {activeView === 'organizador' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {bolao.modalidade}
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Concurso #{bolao.concurso_numero}
              </span>
              <span className="text-slate-400 text-xs font-mono">
                · Cota: R$ {bolao.valor_cota.toFixed(2)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight mt-1 text-white">
              {bolao.nome}
            </h1>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={copyPix}
              aria-label="Copiar chave PIX do organizador"
              className="w-full md:w-auto flex items-center justify-between sm:justify-start gap-2.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 py-2.5 px-3.5 min-h-[44px] rounded-xl transition-all duration-150 active:scale-[0.98] text-white shadow-xs"
            >
              <div className="flex items-center gap-2 truncate">
                {copiedPix ? <Check size={16} className="text-emerald-400 shrink-0" /> : <Copy size={16} className="shrink-0" />}
                <span className="truncate">
                  PIX: <strong className="font-mono text-emerald-300">{bolao.chave_pix_organizador}</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-900 px-1.5 py-0.5 rounded">
                {copiedPix ? 'Copiado!' : 'Copiar'}
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
