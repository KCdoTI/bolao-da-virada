import React from 'react';
import { X, ShieldCheck, Scale, Smartphone, Globe, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

interface LegalFaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalFaqModal: React.FC<LegalFaqModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Regras, Legalidade e Instalação"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <Scale size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Guia Legal, Regras e Distribuição</h3>
              <p className="text-xs text-slate-400">Transparência jurídica e arquitetura da plataforma</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar guia legal"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm leading-relaxed">
          {/* 1. Legalidade & Licenciamento */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
              <ShieldCheck size={18} />
              <span>Podemos comercializar este aplicativo no Brasil?</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              <strong>SIM, como Software SaaS (Ferramenta de Produtividade/Gestão).</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300 text-xs">
              <li>
                <strong>O que a plataforma faz:</strong> Oferece ferramentas de controle financeiro, OCR com IA para leitura de bilhetes, auditoria de dezenas e cálculo matemático de desdobramento.
              </li>
              <li>
                <strong>O que a plataforma NÃO faz:</strong> Não recebe nem custodia dinheiro de apostas, não faz apostas em nome de terceiros e não cobra comissão sobre prêmios sorteados (o que violaria a Lei de Contravenções Penais e o monopólio lotérico da Caixa).
              </li>
              <li>
                <strong>Cobrança segura:</strong> A monetização é feita estritamente pela licença de uso do software (ex: taxa fixa por bolão ou assinatura anual para organizadores).
              </li>
            </ul>
          </div>

          {/* 2. Distribuição: Lojas vs Navegador */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
              <Globe size={18} className="text-blue-500" />
              <span>Por que usar no Navegador (Web App / PWA) em vez de App Store / Play Store?</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block">Vantagens do Navegador (PWA):</span>
                <p>• <strong>Zero Atrito:</strong> Cotistas abrem direto pelo WhatsApp sem baixar 60MB nem criar conta.</p>
                <p>• <strong>Zero Taxas de Lojas:</strong> Não perde 15% a 30% da receita para Apple e Google.</p>
                <p>• <strong>Sem Risco de Banimento:</strong> As políticas da Apple (Diretriz 5.3) costumam rejeitar apps com palavras como "Loterias" ou "Apostas".</p>
                <p>• <strong>Deploy Instantâneo:</strong> Atualizações críticas no dia 31 de dezembro entram no ar em segundos.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Como instalar no Celular (PWA):</span>
                <p>• <strong>iPhone (iOS Safari):</strong> Toque no botão de <em>Compartilhar</em> e selecione <em>"Adicionar à Tela de Início"</em>.</p>
                <p>• <strong>Android (Chrome):</strong> Toque nos três pontinhos e selecione <em>"Instalar aplicativo"</em>.</p>
                <p>• O app passa a rodar em tela cheia com ícone próprio e carregamento offline!</p>
              </div>
            </div>
          </div>

          {/* 3. Regras da Caixa e Rateio */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span>Regra Oficial de Desdobramento da Caixa Econômica Federal</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apostas com mais de 6 dezenas (7 a 15 números) pagam <strong>múltiplos prêmios</strong> derivados quando acertam a Quadra, Quina ou Sena:
            </p>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              Prêmios = C(m, k) × C(n - m, 6 - k)
            </div>
            <p className="text-[11px] text-slate-500">
              Exemplo: Aposta de 7 números que acerta 5 dezenas ganha automaticamente <strong>2 Quinas</strong> e <strong>5 Quadras</strong>. O Bolão da Mega calcula isso de forma 100% automatizada.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
