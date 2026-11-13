import React from 'react';
import { X, ExternalLink, ShieldCheck, Ticket } from 'lucide-react';

interface TicketViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  gameIndex: number;
  dezenas?: number[];
  codigoBilhete?: string;
}

export const TicketViewerModal: React.FC<TicketViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  gameIndex,
  dezenas = [],
  codigoBilhete,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Comprovante do Jogo ${gameIndex}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white bg-slate-900">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-tight text-white">Comprovante Oficial • Jogo #{gameIndex}</h3>
              <p className="text-[11px] text-slate-400">Autenticação emitida em lotérica oficial da Caixa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar comprovante"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Informações do Bilhete */}
        <div className="bg-slate-950/70 px-4 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Dezenas Registradas ({dezenas.length})</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {dezenas.map((num) => (
                <span
                  key={num}
                  className="w-6 h-6 rounded-full bg-emerald-600/90 text-white font-extrabold text-[11px] flex items-center justify-center"
                >
                  {num < 10 ? `0${num}` : num}
                </span>
              ))}
            </div>
          </div>
          {codigoBilhete && (
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Controle</span>
              <span className="font-mono text-emerald-400 text-xs">{codigoBilhete}</span>
            </div>
          )}
        </div>

        {/* Visualização da Imagem / SVG */}
        <div className="p-4 overflow-y-auto flex items-center justify-center bg-black/40 min-h-[300px]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Bilhete Oficial da Aposta #${gameIndex}`}
              className="max-h-[55vh] w-auto object-contain rounded-lg border border-slate-800 shadow-lg"
              loading="lazy"
            />
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Ticket size={36} className="mx-auto text-slate-600" />
              <p className="text-xs">Foto física do bilhete não anexada pelo organizador.</p>
            </div>
          )}
        </div>

        {/* Footer com link direto */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-900 text-xs">
          <span className="text-slate-400 text-[11px]">Auditado pelo Bolão da Mega</span>
          {imageUrl && (
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition"
            >
              <ExternalLink size={14} /> Abrir em tamanho real
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
