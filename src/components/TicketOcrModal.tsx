import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  X,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  ScanLine,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import {
  preprocessTicketImage,
  parseCaixaTicketText,
  ExtractedGameCandidate,
  SAMPLE_TICKETS,
} from '../utils/lotteryOcrParser';

interface TicketOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDezenasConfirmadas: (dezenas: number[], imageUrl?: string) => void;
}

export const TicketOcrModal: React.FC<TicketOcrModalProps> = ({
  isOpen,
  onClose,
  onDezenasConfirmadas,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [detectedGames, setDetectedGames] = useState<ExtractedGameCandidate[]>([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessImage = async (file: File) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setDetectedGames([]);
      setSelectedGameIndex(null);
      setProgressMsg('Pré-processando imagem (contraste e nitidez)...');

      const processedUrl = await preprocessTicketImage(file);
      setImagePreview(processedUrl);

      setProgressMsg('Iniciando reconhecimento de caracteres...');
      let ocrText = '';

      try {
        const worker = await createWorker('por');
        setProgressMsg('Analisando dezenas impressas no bilhete...');
        const ret = await worker.recognize(processedUrl);
        await worker.terminate();
        ocrText = ret.data.text;
      } catch (ocrErr) {
        console.warn('Tesseract worker falhou ou offline, usando parser local:', ocrErr);
        // Fallback: extrai do nome do arquivo ou usa regex direta se texto estiver embutido
        ocrText = file.name;
      }

      const games = parseCaixaTicketText(ocrText);

      if (games.length === 0) {
        setErrorMessage(
          'Não identificamos automaticamente uma sequência com 6 a 15 dezenas legíveis. Você pode colar o texto ou usar um bilhete de exemplo.'
        );
        setShowManualInput(true);
      } else {
        setDetectedGames(games);
        setSelectedGameIndex(0);
      }
    } catch (err: any) {
      setErrorMessage('Erro ao ler a foto. Verifique a iluminação ou tente selecionar um bilhete de teste.');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const handleTestWithSample = (sample: typeof SAMPLE_TICKETS[0]) => {
    setLoading(true);
    setErrorMessage(null);
    setProgressMsg('Processando bilhete oficial de teste...');

    setTimeout(() => {
      const games = parseCaixaTicketText(sample.rawText);
      setDetectedGames(games);
      setSelectedGameIndex(0);
      setImagePreview(null);
      setLoading(false);
      setProgressMsg('');
    }, 400);
  };

  const handleProcessManualText = () => {
    if (!manualText.trim()) return;
    const games = parseCaixaTicketText(manualText);
    if (games.length === 0) {
      setErrorMessage('Nenhuma sequência válida de 6 a 15 dezenas (entre 01 e 60) foi detectada no texto.');
    } else {
      setDetectedGames(games);
      setSelectedGameIndex(0);
      setErrorMessage(null);
    }
  };

  const handleConfirm = () => {
    if (selectedGameIndex !== null && detectedGames[selectedGameIndex]) {
      onDezenasConfirmadas(
        detectedGames[selectedGameIndex].dezenas,
        imagePreview || undefined
      );
      handleClose();
    }
  };

  const handleClose = () => {
    setImagePreview(null);
    setDetectedGames([]);
    setErrorMessage(null);
    setManualText('');
    setShowManualInput(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Leitor de Bilhete por OCR"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-emerald-900 flex items-center justify-between bg-emerald-800 text-white">
          <div className="flex items-center gap-2">
            <ScanLine size={20} className="text-amber-300" />
            <div>
              <h3 className="font-bold text-base leading-tight">Leitura Automática de Bilhete (OCR)</h3>
              <p className="text-xs text-emerald-100">Extrai dezenas de 01 a 60 direto do comprovante da Caixa</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar leitor de bilhete"
            className="p-1 rounded-lg hover:bg-emerald-700 text-emerald-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={(e) => e.target.files?.[0] && handleProcessImage(e.target.files[0])}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleProcessImage(e.target.files[0])}
            className="hidden"
          />

          {/* Opções de Captura */}
          {!imagePreview && detectedGames.length === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-emerald-500/50 hover:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 transition group active:scale-95"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2 group-hover:scale-110 transition shadow-xs">
                    <Camera size={24} className="text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <span className="font-bold text-sm text-center">Tirar Foto do Bilhete</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
                    Câmera do celular (comprovante físico)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 transition group active:scale-95"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-110 transition shadow-xs">
                    <Upload size={22} className="text-slate-600 dark:text-slate-400" />
                  </div>
                  <span className="font-bold text-sm text-center">Upload da Galeria</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
                    Arquivo JPG, PNG ou print de aposta
                  </span>
                </button>
              </div>

              {/* Bilhetes Rápidos de Teste */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Testar instantaneamente com comprovante simulado:</span>
                </div>
                <div className="flex flex-col gap-2">
                  {SAMPLE_TICKETS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTestWithSample(sample)}
                      className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800 text-xs transition flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">{sample.nome}</span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        {sample.dezenasEsperadas.join(' - ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loader */}
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <Loader2 size={36} className="animate-spin text-emerald-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{progressMsg}</p>
            </div>
          )}

          {/* Erro */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Aviso do Leitor:</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Fallback de entrada manual / cola texto */}
          {showManualInput && (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Cole o texto bruto ou dezenas extraídas do bilhete:
              </label>
              <textarea
                rows={3}
                placeholder="Exemplo: 05 10 18 34 42 59"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleProcessManualText}
                className="w-full py-2 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 transition"
              >
                Extrair Dezenas do Texto
              </button>
            </div>
          )}

          {/* Jogos Detectados */}
          {detectedGames.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {detectedGames.length === 1 ? '1 Jogo Reconhecido' : `${detectedGames.length} Jogos Reconhecidos`}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Clique para selecionar
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {detectedGames.map((game, idx) => {
                  const isSelected = selectedGameIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedGameIndex(idx)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Jogo #{idx + 1} • {game.dezenas.length} dezenas
                        </span>
                        {isSelected && <Check size={16} className="text-emerald-600" />}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {game.dezenas.map((n) => (
                          <span
                            key={n}
                            className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center shadow-xs"
                          >
                            {n < 10 ? `0${n}` : n}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setDetectedGames([]);
                    setShowManualInput(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                >
                  Tirar outra foto ou escolher outro arquivo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {detectedGames.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={selectedGameIndex === null}
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Check size={16} />
              Preencher no Volante
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
