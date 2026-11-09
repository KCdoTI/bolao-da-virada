import React, { useState } from 'react';
import { X, UserPlus, Check } from 'lucide-react';
import { Participante, StatusPagamento } from '../types';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (novo: Omit<Participante, 'id'>) => void;
  bolaoId: string;
  valorCota: number;
}

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  bolaoId,
  valorCota,
}) => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [qtdCotas, setQtdCotas] = useState(1);
  const [status, setStatus] = useState<StatusPagamento>('Pago');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Por favor, informe o nome do participante.');
      return;
    }
    if (!telefone.trim()) {
      setError('Por favor, informe o telefone para contato.');
      return;
    }
    if (qtdCotas < 1) {
      setError('A quantidade de cotas deve ser no mínimo 1.');
      return;
    }

    onAdd({
      bolao_id: bolaoId,
      nome: nome.trim(),
      telefone: telefone.trim(),
      qtd_cotas: qtdCotas,
      status_pagamento: status,
      data_registro: new Date().toISOString().split('T')[0],
    });

    setNome('');
    setTelefone('');
    setQtdCotas(1);
    setStatus('Pago');
    setError('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar Participante"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-emerald-400" />
            <h3 className="font-bold text-base text-white">Novo Participante (Cotista)</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar formulário"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome Completo:
            </label>
            <input
              type="text"
              required
              placeholder="Ex: João Ferreira"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Telefone / WhatsApp:
            </label>
            <input
              type="tel"
              required
              placeholder="(11) 98765-4321"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantidade de Cotas:
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={qtdCotas}
                onChange={(e) => setQtdCotas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Total: R$ {(qtdCotas * valorCota).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status Inicial:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusPagamento)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Pago">Pago</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <Check size={16} /> Salvar Participante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
