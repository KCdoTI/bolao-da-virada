import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { Bolao, Participante, Jogo } from '../types';
import { buildWhatsAppShareMessage } from '../utils/transparency';

interface ShareBarProps {
  bolao: Bolao;
  participantes: Participante[];
  jogos: Jogo[];
  onOpenPublicView: () => void;
}

export const ShareBar: React.FC<ShareBarProps> = ({
  bolao,
  participantes,
  jogos,
  onOpenPublicView,
}) => {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bolaodavirada.com.br';
  const publicUrl = `${baseUrl}/#b-${bolao.hash_slug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleWhatsAppShare = () => {
    const rawMsg = buildWhatsAppShareMessage(bolao, participantes, jogos, publicUrl);
    const encoded = encodeURIComponent(rawMsg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="bg-slate-900 dark:bg-slate-900/90 text-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-800 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h2 className="font-bold text-sm sm:text-base text-white">Link de Transparência para os Participantes</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Compartilhe com o grupo: os cotistas acessam os comprovantes dos bilhetes e o placar ao vivo sem necessidade de login ou cadastro.
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs font-mono text-emerald-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 max-w-md truncate">
            <span className="text-slate-500 select-none">URL:</span>
            <span className="truncate">{publicUrl}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Botão Copiar Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copiar link de transparência"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700/80 active:scale-[0.98] text-white text-xs font-semibold py-2 px-3.5 rounded-xl border border-slate-700/60 transition-all duration-150 shadow-xs"
          >
            {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>

          {/* Botão WhatsApp Formatado */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            aria-label="Enviar resumo do bolão no WhatsApp"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-all duration-150"
          >
            <MessageCircle size={15} className="fill-slate-950 text-slate-950" />
            <span>Compartilhar no WhatsApp</span>
          </button>

          {/* Alternar para Visão do Participante */}
          <button
            type="button"
            onClick={onOpenPublicView}
            aria-label="Visualizar tela pública do participante"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all duration-150 active:scale-[0.98] border border-slate-700/50 text-xs font-medium"
            title="Abrir como participante"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Ver como Cotista</span>
          </button>
        </div>
      </div>
    </div>
  );
};
