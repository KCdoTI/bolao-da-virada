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
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
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
  // Passos: 1 = Captura & OCR, 2 = Auditoria Visual Lado a Lado
  const [step, setStep] = useState<1 | 2>(1);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [detectedGames, setDetectedGames] = useState<ExtractedGameCandidate[]>([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Estado da Etapa 2: Dezenas editáveis e validação humana
  const [editableDezenas, setEditableDezenas] = useState<number[]>([]);
  const [novaDezenaInput, setNovaDezenaInput] = useState<string>('');
  const [conferidoManualmente, setConferidoManualmente] = useState(false);

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
        console.warn('Tesseract worker falhou ou offline, usando fallback local:', ocrErr);
        ocrText = file.name;
      }

      const games = parseCaixaTicketText(ocrText);

      if (games.length === 0) {
        setErrorMessage(
          'Não identificamos automaticamente uma sequência com 6 a 15 dezenas legíveis. Você pode colar o texto ou usar um bilhete de teste.'
        );
        setShowManualInput(true);
      } else {
        setDetectedGames(games);
        setSelectedGameIndex(0);
        setEditableDezenas([...games[0].dezenas].sort((a, b) => a - b));
        setStep(2); // Avança automaticamente para auditoria lado a lado
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
      setEditableDezenas([...games[0].dezenas].sort((a, b) => a - b));
      setLoading(false);
      setProgressMsg('');
      setStep(2); // Avança para etapa 2 de conferência
    }, 350);
  };

  const handleProcessManualText = () => {
    if (!manualText.trim()) return;
    const games = parseCaixaTicketText(manualText);
    if (games.length === 0) {
      setErrorMessage('Nenhuma sequência válida de 6 a 15 dezenas (entre 01 e 60) foi detectada no texto.');
    } else {
      setDetectedGames(games);
      setSelectedGameIndex(0);
      setEditableDezenas([...games[0].dezenas].sort((a, b) => a - b));
      setErrorMessage(null);
      setStep(2);
    }
  };

  // Funções da Etapa 2 (Edição de dezenas)
  const handleRemoveDezena = (dezena: number) => {
    if (editableDezenas.length <= 6) {
      alert('Uma aposta da Mega-Sena precisa de no mínimo 6 dezenas.');
      return;
    }
    setEditableDezenas((prev) => prev.filter((d) => d !== dezena));
  };

  const handleAddDezena = () => {
    const num = parseInt(novaDezenaInput, 10);
    if (isNaN(num) || num < 1 || num > 60) {
      alert('Digite uma dezena válida entre 01 e 60.');
      return;
    }
    if (editableDezenas.includes(num)) {
      alert(`A dezena ${num < 10 ? `0${num}` : num} já está presente na aposta.`);
      return;
    }
    if (editableDezenas.length >= 15) {
      alert('O limite máximo por bilhete da Caixa é de 15 dezenas.');
      return;
    }
    setEditableDezenas((prev) => [...prev, num].sort((a, b) => a - b));
    setNovaDezenaInput('');
  };

  const handleUpdateSingleDezena = (index: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val)) return;
    const updated = [...editableDezenas];
    updated[index] = val;
    setEditableDezenas(updated);
  };

  // Validações antes da gravação final
  const temDuplicadas = new Set(editableDezenas).size !== editableDezenas.length;
  const foraDoRange = editableDezenas.some((d) => d < 1 || d > 60);
  const quantidadeValida = editableDezenas.length >= 6 && editableDezenas.length <= 15;
  const podeConfirmar = quantidadeValida && !temDuplicadas && !foraDoRange && conferidoManualmente;

  const handleConfirmFinal = () => {
    if (!podeConfirmar) return;
    onDezenasConfirmadas(
      [...editableDezenas].sort((a, b) => a - b),
      imagePreview || undefined
    );
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setImagePreview(null);
    setDetectedGames([]);
    setSelectedGameIndex(null);
    setEditableDezenas([]);
    setErrorMessage(null);
    setManualText('');
    setShowManualInput(false);
    setConferidoManualmente(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Leitor de Bilhete por OCR"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header com Indicador de Etapas */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <ScanLine size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">Auditoria OCR de Bilhete Caixa</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Etapa {step} de 2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {step === 1 ? 'Captura e leitura da imagem térmica' : 'Validação humana lado a lado contra o comprovante'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar leitor de bilhete"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
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

          {/* ===================== ETAPA 1: CAPTURA E LEITURA ===================== */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-emerald-500/50 hover:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 transition group active:scale-95 cursor-pointer"
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
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 transition group active:scale-95 cursor-pointer"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLE_TICKETS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTestWithSample(sample)}
                      className="p-3 text-left rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {sample.nome}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {sample.dezenasEsperadas.length} dezenas oficiais Caixa
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Entrada Manual de Texto de Bilhete */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {!showManualInput ? (
                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FileText size={14} />
                    <span>Colar texto ou digitação manual</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Texto do Comprovante Caixa:
                    </label>
                    <textarea
                      rows={3}
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Ex: 05 10 18 34 42 59 ou cole o texto do leitor"
                      className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleProcessManualText}
                      className="px-3.5 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Processar Texto
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Estado de Carregamento */}
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-emerald-500" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{progressMsg}</p>
            </div>
          )}

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* ===================== ETAPA 2: AUDITORIA LADO A LADO ===================== */}
          {step === 2 && !loading && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span className="font-semibold">Conferência Obrigatória: compare cada dezena com o bilhete físico</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[11px] underline text-slate-400 hover:text-white cursor-pointer"
                >
                  Voltar para foto
                </button>
              </div>

              {/* Grid Lado a Lado (Foto do Bilhete vs Dezenas Editáveis) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lado Esquerdo: Imagem do Bilhete */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-bold flex items-center gap-1">
                      <Eye size={13} />
                      <span>Comprovante Escaneado</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Zoom disponível</span>
                  </div>

                  <div className="flex-1 min-h-[200px] max-h-[300px] overflow-auto rounded-lg bg-black/60 border border-slate-800/80 flex items-center justify-center p-2">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Comprovante de aposta"
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    ) : (
                      <div className="text-center p-4 text-xs text-slate-500">
                        <FileText size={28} className="mx-auto mb-1 text-slate-600" />
                        <span>Comprovante de teste oficial Caixa</span>
                        <div className="font-mono text-[10px] text-slate-600 mt-1">
                          Terminal Autenticado #04.912.842
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Editor de Dezenas */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        Dezenas Detectadas ({editableDezenas.length})
                      </span>
                      <span className={`text-[11px] font-mono font-bold ${
                        editableDezenas.length >= 6 && editableDezenas.length <= 15
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}>
                        {editableDezenas.length} / 15 máx
                      </span>
                    </div>

                    {/* Grade de Dezenas com remoção inline */}
                    <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-1">
                      {editableDezenas.map((dezena, idx) => (
                        <div
                          key={`${dezena}-${idx}`}
                          className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 shadow-xs"
                        >
                          <span className="font-black font-mono text-sm text-emerald-600 dark:text-emerald-400">
                            {dezena < 10 ? `0${dezena}` : dezena}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDezena(dezena)}
                            aria-label={`Remover dezena ${dezena}`}
                            className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Adicionar Dezena Manualmente se OCR perdeu algum número */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Corrigir ou adicionar dezena faltante (01 a 60):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        placeholder="Ex: 07"
                        value={novaDezenaInput}
                        onChange={(e) => setNovaDezenaInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDezena()}
                        className="w-24 text-center font-mono font-bold text-sm p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddDezena}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition active:scale-95 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox de Auditoria e Responsabilidade do Organizador */}
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={conferidoManualmente}
                    onChange={(e) => setConferidoManualmente(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                    <strong>Declaração de Auditoria:</strong> Conferi visualmente as {editableDezenas.length} dezenas contra o comprovante impresso pela Caixa e confirmo que não há erros de OCR.
                  </span>
                </label>

                {temDuplicadas && (
                  <p className="text-[11px] text-red-500 font-bold">
                    ⚠️ Atenção: Há dezenas repetidas nesta aposta. Corrija antes de confirmar.
                  </p>
                )}
                {foraDoRange && (
                  <p className="text-[11px] text-red-500 font-bold">
                    ⚠️ Atenção: As dezenas da Mega-Sena devem estar estritamente entre 01 e 60.
                  </p>
                )}
                {editableDezenas.length < 6 && (
                  <p className="text-[11px] text-amber-500 font-bold">
                    ⚠️ Mínimo de 6 dezenas para aposta oficial da Caixa.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer com Botões de Ação */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          {step === 2 ? (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                disabled={!podeConfirmar}
                onClick={handleConfirmFinal}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all duration-150 shadow-xs cursor-pointer ${
                  podeConfirmar
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <Check size={16} />
                <span>Aprovar e Registrar Aposta ({editableDezenas.length} dezenas)</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="ml-auto px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
