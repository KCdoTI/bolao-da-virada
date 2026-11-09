import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  Brain,
  BarChart3,
  Flame,
  Scale,
  Grid,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Jogo } from '../types';
import {
  analisarCoberturaBolao,
  gerarJogoEstrategico,
  EstrategiaTipo,
  JogoEstrategicoGerado,
  DEZENAS_HISTORICAS_VIRADA,
} from '../utils/aiStrategyEngine';

interface AiStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jogos: Jogo[];
  onApplyToVolante: (dezenas: number[]) => void;
}

export const AiStrategyModal: React.FC<AiStrategyModalProps> = ({
  isOpen,
  onClose,
  jogos,
  onApplyToVolante,
}) => {
  const [activeTab, setActiveTab] = useState<'gerador' | 'cobertura'>('gerador');
  const [estrategia, setEstrategia] = useState<EstrategiaTipo>('equilibrio');
  const [qtdDezenas, setQtdDezenas] = useState<number>(6);

  const dezenasExistentes = Array.from(
    new Set(jogos.flatMap((j) => j.dezenas))
  ).sort((a, b) => a - b);

  const [jogoGerado, setJogoGerado] = useState<JogoEstrategicoGerado>(() =>
    gerarJogoEstrategico('equilibrio', 6, dezenasExistentes)
  );

  const analise = analisarCoberturaBolao(jogos);

  if (!isOpen) return null;

  const handleGerarNovo = (tipo: EstrategiaTipo = estrategia, qtd: number = qtdDezenas) => {
    const novo = gerarJogoEstrategico(tipo, qtd, dezenasExistentes);
    setJogoGerado(novo);
  };

  const handleSelectEstrategia = (tipo: EstrategiaTipo) => {
    setEstrategia(tipo);
    handleGerarNovo(tipo, qtdDezenas);
  };

  const handleSelectQtd = (qtd: number) => {
    setQtdDezenas(qtd);
    handleGerarNovo(estrategia, qtd);
  };

  const handleAplicar = () => {
    onApplyToVolante(jogoGerado.dezenas);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Consultor IA e Gerador Estratégico do Bolão"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-emerald-900 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Consultor IA & Gerador Estratégico</h3>
              <p className="text-xs text-emerald-100">Otimização probabilística baseada no histórico da Mega da Virada</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar consultor IA"
            className="p-1 rounded-lg hover:bg-emerald-700 text-emerald-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Abas do Modal */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('gerador')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'gerador'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Brain size={14} />
            <span>Gerador Inteligente</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cobertura')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'cobertura'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={14} />
            <span>Diagnóstico do Bolão ({analise.percentualCobertura}%)</span>
          </button>
        </div>

        {/* Conteúdo Aba: GERADOR */}
        {activeTab === 'gerador' && (
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Escolha da Estratégia */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                1. Selecione a Estratégia Tática da IA:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectEstrategia('equilibrio')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    estrategia === 'equilibrio'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Scale size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Equilíbrio Matemático</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Paridade 3 pares / 3 ímpares, padrão em mais de 80% dos sorteios.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectEstrategia('historica')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    estrategia === 'historica'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Flame size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Campeões da Virada</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Inclui as dezenas mais sorteadas na história da Mega da Virada.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectEstrategia('espalhada')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    estrategia === 'espalhada'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Grid size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Dispersão por Quadrantes</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Evita agrupamento excessivo; espalha entre os 4 blocos da cartela.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectEstrategia('fechamento')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    estrategia === 'fechamento'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <ShieldAlert size={18} className="text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Preencher Inexploradas</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Foca exclusivamente em dezenas que nosso bolão ainda não apostou.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantidade de Dezenas */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                2. Dezenas na Aposta:
              </span>
              <div className="flex items-center gap-1.5">
                {[6, 7, 8, 9, 10].map((qtd) => (
                  <button
                    key={qtd}
                    type="button"
                    onClick={() => handleSelectQtd(qtd)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                      qtdDezenas === qtd
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {qtd}
                  </button>
                ))}
              </div>
            </div>

            {/* Display do Jogo Gerado */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {jogoGerado.titulo}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                    ({jogoGerado.dezenas.length} números)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleGerarNovo()}
                  className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1 text-xs font-semibold"
                  title="Gerar outra combinação com mesma estratégia"
                >
                  <RefreshCw size={13} />
                  <span>Sortear outro</span>
                </button>
              </div>

              {/* Bolinhas */}
              <div className="flex flex-wrap gap-2">
                {jogoGerado.dezenas.map((num) => (
                  <span
                    key={num}
                    className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md ring-2 ring-emerald-400"
                  >
                    {num < 10 ? `0${num}` : num}
                  </span>
                ))}
              </div>

              {/* Métricas do Jogo Gerado */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                <span>
                  Paridade:{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {jogoGerado.estatisticas.pares} pares / {jogoGerado.estatisticas.impares} ímpares
                  </strong>
                </span>
                <span>
                  Quadrantes:{' '}
                  <strong className="text-slate-700 dark:text-slate-300 font-mono">
                    Q1:{jogoGerado.estatisticas.quadrantes.q1} Q2:{jogoGerado.estatisticas.quadrantes.q2} Q3:{jogoGerado.estatisticas.quadrantes.q3} Q4:{jogoGerado.estatisticas.quadrantes.q4}
                  </strong>
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{jogoGerado.explicacao}"
              </p>
            </div>
          </div>
        )}

        {/* Conteúdo Aba: COBERTURA DO BOLÃO */}
        {activeTab === 'cobertura' && (
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Medidor de Cobertura */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  Cobertura da Cartela da Mega-Sena
                </span>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  {analise.percentualCobertura}%
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {analise.dezenasUnicasCobertas.length} de 60 dezenas cobertas em {analise.totalJogos} apostas
                </p>
              </div>

              <div className="w-full sm:w-48 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Diversificação</span>
                  <span className="font-bold">{analise.percentualCobertura}%</span>
                </div>
                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${analise.percentualCobertura}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Diagnóstico da IA */}
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Brain size={15} />
                <span>Parecer Estratégico da IA:</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                {analise.diagnosticoIa}
              </p>

              {analise.pontosFortes.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">Pontos Fortes:</span>
                  {analise.pontosFortes.map((p, i) => (
                    <div key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                      <Check size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}

              {analise.recomendacoes.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">Sugestões de Otimização:</span>
                  {analise.recomendacoes.map((r, i) => (
                    <div key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                      <Sparkles size={13} className="text-amber-500 mt-0.5 shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dezenas Mais Frequentes no Bolão */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                Dezenas Mais Repetidas nos Nossos Jogos:
              </span>
              <div className="flex flex-wrap gap-2">
                {analise.frequenciaDezenas.slice(0, 10).map((f) => (
                  <div
                    key={f.num}
                    className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl text-xs font-semibold"
                  >
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-[11px]">
                      {f.num < 10 ? `0${f.num}` : f.num}
                    </span>
                    <span className="text-slate-500 text-[11px]">{f.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer com botão de ação */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {activeTab === 'gerador' ? 'Jogo pronto para inclusão no bolão' : 'Análise atualizada com os 4 jogos'}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Fechar
            </button>

            {activeTab === 'gerador' && (
              <button
                type="button"
                onClick={handleAplicar}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                <Check size={16} />
                <span>Preencher no Volante</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
