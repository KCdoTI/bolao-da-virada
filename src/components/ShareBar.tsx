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
    <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-emerald-700/60 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-amber-300" />
            <h2 className="font-bold text-sm sm:text-base text-white">Link de Transparência para os Participantes</h2>
          </div>
          <p className="text-xs text-emerald-100/90 mt-1 max-w-xl">
            Compartilhe com o grupo: os cotistas acessam os comprovantes dos bilhetes e o placar ao vivo sem necessidade de login ou cadastro.
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-emerald-200/90 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60 max-w-md truncate">
            <span className="text-slate-400 select-none">URL:</span>
            <span className="truncate">{publicUrl}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Botão Copiar Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copiar link de transparência"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-800/90 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold py-2.5 px-3.5 rounded-xl border border-emerald-600/50 transition shadow-xs"
          >
            {copied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
            <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>

          {/* Botão WhatsApp Formatado */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            aria-label="Enviar resumo do bolão no WhatsApp"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl shadow-md transition"
          >
            <MessageCircle size={16} className="fill-slate-950 text-slate-950" />
            <span>Enviar no WhatsApp</span>
          </button>

          {/* Alternar para Visão do Participante */}
          <button
            type="button"
            onClick={onOpenPublicView}
            aria-label="Visualizar tela pública do participante"
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-800/50 hover:bg-emerald-700/80 text-emerald-100 hover:text-white transition border border-emerald-700/50 text-xs font-semibold"
            title="Abrir como participante"
          >
            <ExternalLink size={15} />
            <span className="hidden sm:inline">Ver como Cotista</span>
          </button>
        </div>
      </div>
    </div>
  );
};
