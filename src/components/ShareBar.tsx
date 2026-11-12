import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, ExternalLink, ShieldCheck, Key, Users } from 'lucide-react';
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
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bolao-da-virada.app';
  const publicUrl = `${baseUrl}/#b-${bolao.hash_slug}`;
  const adminUrl = `${baseUrl}/#admin-${bolao.admin_token || bolao.id}`;

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2200);
    } catch {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2200);
    }
  };

  const handleCopyAdminLink = async () => {
    try {
      await navigator.clipboard.writeText(adminUrl);
      setCopiedAdmin(true);
      setTimeout(() => setCopiedAdmin(false), 2200);
    } catch {
      setCopiedAdmin(true);
      setTimeout(() => setCopiedAdmin(false), 2200);
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
            <h2 className="font-bold text-sm sm:text-base text-white">Links de Compartilhamento e Acesso</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            O <strong>Link Público</strong> é seguro para o grupo no WhatsApp (oculta pendências individuais e telefones). O <strong>Link Admin</strong> é exclusivo para sua gestão em outros dispositivos.
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-emerald-300 max-w-xs sm:max-w-md truncate">
              <span className="text-slate-500 select-none">Público:</span>
              <span className="truncate">{publicUrl}</span>
            </div>

            <button
              type="button"
              onClick={handleCopyAdminLink}
              title="Copiar link com token de administrador para abrir em outro dispositivo"
              className="text-[11px] font-sans font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 transition cursor-pointer"
            >
              <Key size={12} className="text-amber-400" />
              <span>{copiedAdmin ? 'Link Admin Copiado!' : 'Copiar Link Admin'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Botão Copiar Link Público */}
          <button
            type="button"
            onClick={handleCopyPublicLink}
            aria-label="Copiar link público do grupo"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700/80 active:scale-[0.98] text-white text-xs font-semibold py-2 px-3.5 rounded-xl border border-slate-700/60 transition-all duration-150 shadow-xs cursor-pointer"
          >
            {copiedPublic ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            <span>{copiedPublic ? 'Link Copiado!' : 'Copiar Link Público'}</span>
          </button>

          {/* Botão WhatsApp Formatado */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            aria-label="Enviar resumo do bolão no WhatsApp"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-all duration-150 cursor-pointer"
          >
            <MessageCircle size={15} className="fill-slate-950 text-slate-950" />
            <span>Compartilhar no WhatsApp</span>
          </button>

          {/* Alternar para Visão do Participante */}
          <button
            type="button"
            onClick={onOpenPublicView}
            aria-label="Visualizar tela pública do participante"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all duration-150 active:scale-[0.98] border border-slate-700/50 text-xs font-medium cursor-pointer"
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
