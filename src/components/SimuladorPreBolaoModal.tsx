import React, { useState, useMemo } from 'react';
import {
  X,
  Calculator,
  Sliders,
  Calendar,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Clock,
  Ticket,
  AlertTriangle,
  Sparkles,
  Info,
  DollarSign,
  Users,
} from 'lucide-react';
import {
  simularCenariosPreBolao,
  CenariosPreBolao,
  otimizarPlanoApostas,
} from '../utils/preBolaoSimulator';

interface SimuladorPreBolaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAplicarParametros?: (novoValorCota: number, novoPrazoLimite: string) => void;
  valorCotaAtual?: number;
}

export const SimuladorPreBolaoModal: React.FC<SimuladorPreBolaoModalProps> = ({
  isOpen,
  onClose,
  onAplicarParametros,
  valorCotaAtual = 50,
}) => {
  const [cotistasEstimados, setCotistasEstimados] = useState<number>(14);
  const [valorCota, setValorCota] = useState<number>(valorCotaAtual);
  const [taxaInadimplencia, setTaxaInadimplencia] = useState<number>(0.2); // 20%
  const [activeTab, setActiveTab] = useState<'cenarios' | 'cronograma' | 'regras'>('cenarios');

  const cenarios: CenariosPreBolao = useMemo(() => {
    return simularCenariosPreBolao(
      cotistasEstimados,
      valorCota,
      taxaInadimplencia,
      '2026-12-31T20:00:00'
    );
  }, [cotistasEstimados, valorCota, taxaInadimplencia]);

  if (!isOpen) return null;

  const dataFmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-simulador-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Calculator size={20} />
            </div>
            <div>
              <h2 id="modal-simulador-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Planejador Pré-Bolão & Engenharia de Contingência
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simule a arrecadação, dimensione os jogos e antecipe rebaixamento caso alguém não pague.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar simulador"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Parâmetros Interativos */}
        <div className="p-5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Cotistas Estimados */}
          <div>
            <div className="flex justify-between items-center mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Users size={13} className="text-emerald-500" />
                <span>Cotistas Previstos:</span>
              </span>
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                {cotistasEstimados}
              </strong>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={1}
              value={cotistasEstimados}
              onChange={(e) => setCotistasEstimados(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>5 amigos</span>
              <span>60 pessoas</span>
            </div>
          </div>

          {/* Valor da Cota */}
          <div>
            <div className="flex justify-between items-center mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <DollarSign size={13} className="text-emerald-500" />
                <span>Valor por Cota:</span>
              </span>
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                R$ {valorCota.toFixed(2)}
              </strong>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValorCota(v)}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                    valorCota === v
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  R$ {v}
                </button>
              ))}
            </div>
          </div>

          {/* Taxa de Inadimplência Estimada */}
          <div>
            <div className="flex justify-between items-center mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <TrendingDown size={13} className="text-amber-500" />
                <span>Inadimplência Tolerada:</span>
              </span>
              <strong className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
                {Math.round(taxaInadimplencia * 100)}%
              </strong>
            </div>
            <input
              type="range"
              min={0}
              max={0.4}
              step={0.05}
              value={taxaInadimplencia}
              onChange={(e) => setTaxaInadimplencia(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0% (Todos pagam)</span>
              <span>40% (Alto risco)</span>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('cenarios')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'cenarios'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Cenários de Arrecadação & Jogos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cronograma')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'cronograma'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Cronograma & Prazos Críticos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('regras')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'regras'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Regras de Adaptação (Se faltar dinheiro)
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'cenarios' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Cenário Otimista */}
                <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Cenário Otimista (100%)
                      </span>
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      R$ {cenarios.cenarioOtimista.totalArrecadado.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cenarios.cenarioOtimista.cotistasPagantes} cotas pagas
                    </p>

                    <div className="mt-3 pt-3 border-t border-emerald-500/20 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Combinação Caixa Recomendada:
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        {cenarios.cenarioOtimista.plano.resumoVisual}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-emerald-500/20 flex justify-between text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    <span>Apostas Equivalentes:</span>
                    <span>{cenarios.cenarioOtimista.plano.totalApostasEquivalentes}</span>
                  </div>
                </div>

                {/* Cenário Realista */}
                <div className="bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Cenário Realista ({Math.round((1 - taxaInadimplencia) * 100)}%)
                      </span>
                      <Clock size={16} className="text-amber-500" />
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      R$ {cenarios.cenarioRealista.totalArrecadado.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cenarios.cenarioRealista.cotistasPagantes} cotas pagas ({cotistasEstimados - cenarios.cenarioRealista.cotistasPagantes} desistências)
                    </p>

                    <div className="mt-3 pt-3 border-t border-amber-500/20 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Jogos Rebaixados/Adaptados:
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        {cenarios.cenarioRealista.plano.resumoVisual}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-amber-500/20 flex justify-between text-[11px] font-mono text-amber-700 dark:text-amber-400 font-bold">
                    <span>Apostas Equivalentes:</span>
                    <span>{cenarios.cenarioRealista.plano.totalApostasEquivalentes}</span>
                  </div>
                </div>

                {/* Cenário Crítico */}
                <div className="bg-red-500/5 dark:bg-red-950/20 border border-red-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                        Cenário Crítico (55%)
                      </span>
                      <AlertTriangle size={16} className="text-red-500" />
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      R$ {cenarios.cenarioCritico.totalArrecadado.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cenarios.cenarioCritico.cotistasPagantes} cotas pagas (Forte evasão)
                    </p>

                    <div className="mt-3 pt-3 border-t border-red-500/20 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Plano Mínimo de Sobrevivência:
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        {cenarios.cenarioCritico.plano.resumoVisual}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-red-500/20 flex justify-between text-[11px] font-mono text-red-700 dark:text-red-400 font-bold">
                    <span>Apostas Equivalentes:</span>
                    <span>{cenarios.cenarioCritico.plano.totalApostasEquivalentes}</span>
                  </div>
                </div>
              </div>

              {/* Dica Estratégica do Agente */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
                <Info size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">
                    Recomendação de Precificação do Agente:
                  </strong>
                  Para uma meta de <strong>{cotistasEstimados} participantes</strong>, a cota de <strong>R$ {valorCota.toFixed(2)}</strong> gera uma arrecadação suficiente para pelo menos <strong>{cenarios.cenarioRealista.plano.jogos[0]?.dezenas || 7} dezenas</strong> em jogo desdobrado mesmo se houver {Math.round(taxaInadimplencia * 100)}% de desistências.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cronograma' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Cronograma de Segurança Recomendado (Mega da Virada)
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    Margem de Segurança: {cenarios.cronograma.margemSegurancaHoras} horas
                  </span>
                </div>

                <div className="space-y-3 relative pl-6 border-l-2 border-emerald-500/40 ml-2">
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white dark:border-slate-900" />
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      1. Abertura do Bolão e Divulgação da Chave PIX
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {dataFmt(cenarios.cronograma.divulgacaoSugerida)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Envio do link do bolão no grupo do WhatsApp e fixação das regras oficiais.
                    </p>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900" />
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      2. Primeiro Lembrete de Pagamento
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {dataFmt(cenarios.cronograma.primeiroAlertaPagamento)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Disparo no grupo alertando quem ainda não enviou o comprovante.
                    </p>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-900" />
                    <div className="font-bold text-red-600 dark:text-red-400">
                      3. Hard Cutoff — Encerramento de Pagamentos (Limite Final)
                    </div>
                    <div className="text-[11px] font-bold font-mono text-red-600 dark:text-red-400">
                      {dataFmt(cenarios.cronograma.prazoLimiteHard)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Quem não pagou até este minuto é automaticamente excluído do rateio. O valor arrecadado é congelado.
                    </p>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      4. Janela de Adaptação dos Bilhetes (Downgrade se faltou valor)
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {dataFmt(cenarios.cronograma.janelaAdaptacaoJogos)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      O organizador recalcula os volantes no app para o saldo exato em conta.
                    </p>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900" />
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      5. Registro Físico na Lotérica Caixa
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {dataFmt(cenarios.cronograma.prazoIdaLoterica)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Registro das apostas autenticadas e upload imediato das fotos dos bilhetes no app.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'regras' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gatilhos operacionais transparentes para evitar atritos e desconfiança entre os participantes caso haja inadimplência:
              </p>

              <div className="space-y-2.5">
                {cenarios.gatilhosContingencia.map((g, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1"
                  >
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{g.condicao}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 pl-3 leading-relaxed">
                      {g.acaoRecomendada}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-500">
            Arrecadação Realista: <strong className="text-slate-900 dark:text-slate-100 font-mono">R$ {cenarios.cenarioRealista.totalArrecadado.toFixed(2)}</strong>
          </div>

          <div className="flex items-center gap-2">
            {onAplicarParametros && (
              <button
                type="button"
                onClick={() => {
                  onAplicarParametros(valorCota, cenarios.cronograma.prazoLimiteHard);
                  onClose();
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-3.5 min-h-[40px] rounded-xl transition active:scale-[0.98] shadow-xs"
              >
                <Sparkles size={14} />
                <span>Aplicar Valores ao Bolão</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 min-h-[38px] rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
