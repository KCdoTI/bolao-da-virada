import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md animate-in slide-in-from-bottom duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-100'
              : toast.type === 'warning'
              ? 'bg-amber-950/90 border-amber-700/80 text-amber-100'
              : 'bg-slate-900/90 border-slate-700/80 text-slate-100'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'warning' && <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold leading-tight">{toast.title}</h4>
            {toast.message && <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{toast.message}</p>}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Fechar notificação"
            className="p-1 rounded-lg hover:bg-white/10 transition opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
