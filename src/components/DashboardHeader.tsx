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
  Settings,
  Building,
} from 'lucide-react';
import { Bolao } from '../types';
import { BrandLogo } from './BrandLogo';
import { getModalidadeInfo } from '../constants/lotteryCatalog';

interface DashboardHeaderProps {
  bolao: Bolao;
  activeView: 'organizador' | 'publico';
  onChangeView: (view: 'organizador' | 'publico') => void;
  onOpenNovoJogo: () => void;
  onOpenAiConsultant: () => void;
  onOpenPrintReport: () => void;
  onOpenLegalModal: () => void;
  onOpenSimulador?: () => void;
  onOpenConfigurarBolao?: () => void;
  onOpenLotericas?: () => void;
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
  onOpenConfigurarBolao,
  onOpenLotericas,
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
      {/* Top Bar - 3 Zonas com Distribuição Responsiva Calibrada e Espaçosa */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Zona 1: Marca / Nome com espaçamento generoso */}
          <div className="flex items-center gap-3 shrink-0">
            <BrandLogo size={40} />
            <div>
              <span className="font-black text-base sm:text-lg tracking-tight text-white block leading-tight">
                Bolão da Mega
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold tracking-wider uppercase block mt-0.5">
                Gestão & Auditoria de Cotas
              </span>
            </div>
          </div>

          {/* Zona 2 (Desktop): Seletor de Visão Amplo */}
          <nav aria-label="Modo de Visualização" className="hidden md:flex items-center p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => onChangeView('organizador')}
              aria-pressed={activeView === 'organizador'}
              className={`flex items-center gap-2 px-4 py-2 min-h-[38px] text-xs font-bold rounded-xl transition-all duration-150 whitespace-nowrap ${
                activeView === 'organizador'
                  ? 'bg-slate-800 text-white shadow-xs'
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
              className={`flex items-center gap-2 px-4 py-2 min-h-[38px] text-xs font-bold rounded-xl transition-all duration-150 whitespace-nowrap ${
                activeView === 'publico'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye size={15} className={activeView === 'publico' ? 'text-emerald-400' : 'text-slate-400'} />
              <span>Cotista (Público)</span>
            </button>
          </nav>

          {/* Zona 3: Ações e Ferramentas com Espaçamento Limpo */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {activeView === 'organizador' && (
              <>
                {onOpenSimulador && (
                  <button
                    type="button"
                    onClick={onOpenSimulador}
                    className="hidden lg:flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-emerald-300 border border-slate-700/60 text-xs font-semibold transition-all duration-150 active:scale-[0.98]"
                    title="Planejador Pré-Bolão e Simulação de Cenários"
                  >
                    <Calculator size={15} className="text-emerald-400" />
                    <span>Planejador</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenAiConsultant}
                  className="hidden xl:flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 border border-slate-700/60 text-xs font-semibold transition-all duration-150 active:scale-[0.98] shadow-xs"
                  title="Consultor e Gerador de Jogos com IA"
                >
                  <Sparkles size={15} />
                  <span>Consultor IA</span>
                </button>

                {onOpenLotericas && (
                  <button
                    type="button"
                    onClick={onOpenLotericas}
                    className="hidden lg:flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-blue-300 border border-slate-700/60 text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer"
                    title="Horários da Caixa e Lotéricas Próximas"
                  >
                    <Building size={15} className="text-blue-400" />
                    <span>Lotéricas</span>
                  </button>
                )}

                {onOpenConfigurarBolao && (
                  <button
                    type="button"
                    onClick={onOpenConfigurarBolao}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer"
                    title="Configurar Cotas, Chave PIX e Regras"
                  >
                    <Settings size={15} />
                    <span>Configurar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenLegalModal}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer"
                  title="Regras, Licenciamento e Instalação PWA"
                >
                  <Scale size={15} />
                  <span>Regras & Legal</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50 transition-colors"
              title="Alternar tema claro/escuro"
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {activeView === 'organizador' && (
              <button
                type="button"
                onClick={onOpenNovoJogo}
                className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-xs transition-all duration-150 active:scale-[0.98] whitespace-nowrap"
              >
                <PlusCircle size={16} />
                <span>Novo Jogo</span>
              </button>
            )}
          </div>
        </div>

        {/* Zona 2 (Mobile): Seletor de Visão em linha cheia */}
        <nav aria-label="Modo de Visualização Mobile" className="md:hidden grid grid-cols-2 gap-1.5 p-1 mt-3 bg-slate-950/90 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeView('organizador')}
            aria-pressed={activeView === 'organizador'}
            className={`flex items-center justify-center gap-2 py-2.5 min-h-[44px] text-xs font-bold rounded-xl transition-all duration-150 ${
              activeView === 'organizador'
                ? 'bg-slate-800 text-white shadow-xs'
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
            className={`flex items-center justify-center gap-2 py-2.5 min-h-[44px] text-xs font-bold rounded-xl transition-all duration-150 ${
              activeView === 'publico'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={15} className={activeView === 'publico' ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Cotista (Público)</span>
          </button>
        </nav>
      </div>

      {/* Hero Strip de Contexto do Bolão com Espaçamento Amplo e Arejado */}
      {activeView === 'organizador' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-8 sm:pb-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {(() => {
                const infoMod = getModalidadeInfo(bolao.modalidade);
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 ${infoMod.estilo.badgeBg} ${infoMod.estilo.badgeText} border ${infoMod.estilo.badgeBorder} text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs ${
                      infoMod.isEspecial ? 'animate-pulse' : ''
                    }`}
                  >
                    <span>{infoMod.icone}</span>
                    {infoMod.isEspecial ? infoMod.edicaoEspecialNome || infoMod.nome : infoMod.nome}
                  </span>
                );
              })()}
              <span className="bg-slate-800/80 text-slate-300 text-xs font-mono px-3 py-1 rounded-full border border-slate-700/60">
                Concurso #{bolao.concurso_numero}
              </span>
              <span className="bg-slate-800/80 text-slate-300 text-xs font-mono px-3 py-1 rounded-full border border-slate-700/60">
                Cota: R$ {bolao.valor_cota.toFixed(2)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              {bolao.nome}
            </h1>
          </div>

          {/* Card de Chave PIX Arejado */}
          <div className="w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={copyPix}
              aria-label="Copiar chave PIX do organizador"
              className="w-full md:w-auto flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-left transition-all duration-150 active:scale-[0.98] shadow-md group"
            >
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Chave PIX do Organizador
                </span>
                <div className="font-mono text-xs sm:text-sm font-bold text-emerald-300 truncate">
                  {bolao.chave_pix_organizador}
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 group-hover:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700/70 text-xs font-semibold text-slate-200 shrink-0 transition-colors">
                {copiedPix ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-slate-400 group-hover:text-white" />
                    <span>Copiar</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
