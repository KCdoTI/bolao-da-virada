import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Camera, AlertCircle, Trash2, Brain } from 'lucide-react';
import { Jogo } from '../types';
import { TicketOcrModal } from './TicketOcrModal';

interface VolanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveJogo: (novoJogo: Omit<Jogo, 'id' | 'criado_em'>) => void;
  bolaoId: string;
  initialDezenas?: number[];
}

export const VolanteModal: React.FC<VolanteModalProps> = ({
  isOpen,
  onClose,
  onSaveJogo,
  bolaoId,
  initialDezenas,
}) => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [codigoBilhete, setCodigoBilhete] = useState<string>('');
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  useEffect(() => {
    if (initialDezenas && initialDezenas.length > 0) {
      setSelectedNumbers(initialDezenas);
    }
  }, [initialDezenas, isOpen]);

  if (!isOpen) return null;

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      if (selectedNumbers.length >= 15) return;
      setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
    }
  };

  const handleSurpresinha = () => {
    const nums = new Set<number>();
    while (nums.size < 6) {
      nums.add(Math.floor(Math.random() * 60) + 1);
    }
    setSelectedNumbers(Array.from(nums).sort((a, b) => a - b));
  };

  const handleOcrResult = (dezenas: number[], imageUrl?: string) => {
    setSelectedNumbers(dezenas);
    if (imageUrl) {
      setFotoUrl(imageUrl);
    }
  };

  const handleSave = () => {
    if (selectedNumbers.length < 6 || selectedNumbers.length > 15) return;
    onSaveJogo({
      bolao_id: bolaoId,
      dezenas: selectedNumbers,
      foto_url: fotoUrl.trim() || undefined,
      codigo_bilhete: codigoBilhete.trim() || undefined,
    });
    setSelectedNumbers([]);
    setFotoUrl('');
    setCodigoBilhete('');
    onClose();
  };

  const count = selectedNumbers.length;
  const isValid = count >= 6 && count <= 15;

  const pares = selectedNumbers.filter((n) => n % 2 === 0).length;
  const impares = count - pares;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cadastrar Novo Jogo no Volante"
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
      >
        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="px-5 py-4 border-b border-emerald-900 flex items-center justify-between bg-emerald-800 text-white">
            <div>
              <h3 className="font-bold text-lg leading-tight text-white">Cadastrar Novo Jogo</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Volante oficial Mega da Virada (6 a 15 dezenas)</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar volante"
              className="p-1 rounded-full hover:bg-emerald-700 text-emerald-100 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Barra de Ações: Contador, OCR, Surpresinha */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dezenas:</span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                  isValid
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                }`}
              >
                <span>{count} / 15</span>
                {isValid ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <span className="text-[10px] font-sans font-normal">(mín. 6)</span>}
              </span>

              {count >= 6 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  ({pares}P / {impares}I)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Botão OCR / Câmera */}
              <button
                type="button"
                onClick={() => setIsOcrOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition shadow-xs"
              >
                <Camera size={14} />
                <span>Ler Bilhete (OCR)</span>
              </button>

              <button
                type="button"
                onClick={handleSurpresinha}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition active:scale-95"
              >
                <Sparkles size={13} />
                <span>Surpresinha</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNumbers([])}
                aria-label="Limpar dezenas"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                title="Limpar seleção"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Grid dos 60 Números */}
          <div className="p-4 overflow-y-auto max-h-[350px]">
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 sm:gap-2">
              {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedNumbers.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleNumber(num)}
                    aria-label={`Número ${num < 10 ? `0${num}` : num} ${isSelected ? 'selecionado' : ''}`}
                    className={`h-10 sm:h-9 w-full text-sm font-bold rounded-lg transition-all flex items-center justify-center select-none active:scale-90 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500 scale-102'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {num < 10 ? `0${num}` : num}
                  </button>
                );
              })}
            </div>

            {/* Campos de Foto e Autenticação */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Foto / Comprovante (URL opcional):
                </label>
                <input
                  type="text"
                  placeholder="https://... ou preenchido via OCR"
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Código de Autenticação / Controle:
                </label>
                <input
                  type="text"
                  placeholder="Ex: 8492-1049-5832-1920"
                  value={codigoBilhete}
                  onChange={(e) => setCodigoBilhete(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Rodapé de Salvar */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
            {!isValid ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle size={15} />
                <span>{count < 6 ? `Faltam ${6 - count} dezenas para o mínimo` : 'Máximo de 15 atingido'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Check size={16} />
                <span>Jogo pronto ({count} dezenas)</span>
              </div>
            )}

            <button
              type="button"
              disabled={!isValid}
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                isValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 shadow-emerald-600/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              Salvar Jogo no Bolão
            </button>
          </div>
        </div>
      </div>

      {/* Modal de OCR */}
      <TicketOcrModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onDezenasConfirmadas={handleOcrResult}
      />
    </>
  );
};
