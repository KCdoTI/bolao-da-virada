import { validarDezenas } from '../utils/validation';
import { useModalFocus } from '../hooks/useModalFocus';
import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Camera, AlertCircle, Trash2, Coins } from 'lucide-react';
import { Jogo, TipoJogoBolao } from '../types';
import { TicketOcrModal } from './TicketOcrModal';
import { CATALOGO_MODALIDADES, GRUPOS_MODALIDADES, getModalidadeInfo } from '../constants/lotteryCatalog';
import { useLotteryInfo } from '../hooks/useLotteryInfo';

interface VolanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveJogo: (novoJogo: Omit<Jogo, 'id' | 'criado_em'>) => Promise<boolean>;
  bolaoId: string;
  initialDezenas?: number[];
  initialTipoJogo?: TipoJogoBolao;
  modalidade?: string;
  concursoBolao?: number;
}

export const VolanteModal: React.FC<VolanteModalProps> = ({
  isOpen,
  onClose,
  onSaveJogo,
  bolaoId,
  initialDezenas,
  initialTipoJogo = 'normal',
  modalidade = 'Mega-Sena',
  concursoBolao = 1,
}) => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [codigoBilhete, setCodigoBilhete] = useState<string>('');
  const [tipoJogo, setTipoJogo] = useState<TipoJogoBolao>(initialTipoJogo);
  const [modalidadeTroco, setModalidadeTroco] = useState<string>(modalidade);
  const [concursoTroco, setConcursoTroco] = useState<number>(concursoBolao);
  const [observacao, setObservacao] = useState<string>('');
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  useModalFocus(isOpen, onClose);

  const effectiveModalidade = tipoJogo === 'troco' ? modalidadeTroco : modalidade;
  const effectiveConcurso = tipoJogo === 'troco' ? concursoTroco : concursoBolao;

  const { lotteryInfo: trocoLotteryInfo } = useLotteryInfo(
    effectiveModalidade,
    isOpen && tipoJogo === 'troco',
  );

  const infoMod = getModalidadeInfo(effectiveModalidade);
  const minDezenas = infoMod.minimoDezenas;
  const maxDezenas = infoMod.maximoDezenas;
  const universo = infoMod.universoNumeros;

  useEffect(() => {
    if (isOpen) {
      setTipoJogo(initialTipoJogo);
      setModalidadeTroco(modalidade);
      setConcursoTroco(concursoBolao);
      if (initialDezenas && initialDezenas.length > 0) {
        setSelectedNumbers(initialDezenas);
      }
    }
  }, [initialDezenas, initialTipoJogo, isOpen, modalidade, concursoBolao]);

  useEffect(() => {
    if (
      tipoJogo === 'troco' &&
      modalidadeTroco !== modalidade &&
      trocoLotteryInfo?.proximoConcurso?.numero
    ) {
      setConcursoTroco(trocoLotteryInfo.proximoConcurso.numero);
    }
  }, [tipoJogo, modalidadeTroco, modalidade, trocoLotteryInfo]);

  if (!isOpen) return null;

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      if (selectedNumbers.length >= maxDezenas) return;
      setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
    }
  };

  const handleSurpresinha = () => {
    const nums = new Set<number>();
    while (nums.size < minDezenas) {
      nums.add(Math.floor(Math.random() * universo) + 1);
    }
    setSelectedNumbers(Array.from(nums).sort((a, b) => a - b));
  };

  const handleOcrResult = (dezenas: number[], imageUrl?: string) => {
    setSelectedNumbers(dezenas);
    if (imageUrl) {
      setFotoUrl(imageUrl);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    try {
      validarDezenas(selectedNumbers, effectiveModalidade);
    } catch (e) {
      setSaveError((e as Error).message);
      return;
    }
    setSaving(true);
    setSaveError('');
    const customMod =
      tipoJogo === 'troco' && effectiveModalidade !== modalidade
        ? effectiveModalidade
        : undefined;
    const customConc =
      tipoJogo === 'troco' &&
      (customMod || effectiveConcurso !== concursoBolao)
        ? effectiveConcurso
        : undefined;
    const saved = await onSaveJogo({
      bolao_id: bolaoId,
      dezenas: selectedNumbers,
      foto_url: fotoUrl.trim() || undefined,
      codigo_bilhete: codigoBilhete.trim() || undefined,
      tipo_jogo: tipoJogo,
      observacao: observacao.trim() || undefined,
      modalidade_especifica: customMod,
      concurso_especifico: customConc,
    });
    setSaving(false);
    if (!saved) {
      setSaveError('Não foi possível salvar. Confira o aviso no painel e tente novamente.');
      return;
    }
    setSelectedNumbers([]);
    setFotoUrl('');
    setCodigoBilhete('');
    setObservacao('');
    setTipoJogo('normal');
    onClose();
  };

  const count = selectedNumbers.length;
  const isValid =
    count >= minDezenas &&
    count <= maxDezenas &&
    new Set(selectedNumbers).size === count &&
    selectedNumbers.every((n) => Number.isInteger(n) && n >= 1 && n <= universo);

  const pares = selectedNumbers.filter((n) => n % 2 === 0).length;
  const impares = count - pares;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Cadastrar Novo Jogo no Volante (${infoMod.nome})`}
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
      >
        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {saveError && (
            <p role="alert" className="error">
              {saveError}
            </p>
          )}
          {/* Header */}
          <div
            className={`px-5 py-4 border-b flex items-center justify-between text-white ${
              tipoJogo === 'troco'
                ? 'bg-amber-700 border-amber-800'
                : 'bg-emerald-800 border-emerald-900'
            }`}
          >
            <div>
              <h3 className="font-bold text-lg leading-tight text-white flex items-center gap-2">
                <span>{tipoJogo === 'troco' ? '🪙' : infoMod.icone}</span>
                <span>
                  {tipoJogo === 'troco'
                    ? `Cadastrar Jogo de Troco — ${infoMod.nome}`
                    : `Cadastrar Jogo — ${infoMod.nome}`}
                </span>
              </h3>
              <p className="text-xs text-white/90 mt-0.5">
                Seleção de dezenas ({minDezenas} a {maxDezenas} dezenas de 1 a {universo})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar volante"
              className="p-1 rounded-full hover:bg-black/20 text-white transition"
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
                <span>
                  {count} / {maxDezenas}
                </span>
                {isValid ? (
                  <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="text-[10px] font-sans font-normal">(mín. {minDezenas})</span>
                )}
              </span>

              {count >= minDezenas && (
                <span className="text-[11px] text-slate-500 font-medium">
                  ({pares}P / {impares}I)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOcrOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] transition-all shadow-xs"
              >
                <Camera size={14} />
                <span>Câmera / OCR</span>
              </button>

              <button
                type="button"
                onClick={handleSurpresinha}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-2 min-h-[38px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Surpresinha</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNumbers([])}
                aria-label="Limpar dezenas"
                className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Limpar seleção"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Grid dos Números + Opção de Troco */}
          <div className="p-4 overflow-y-auto max-h-[420px] space-y-4">
            {/* Chaveador Normal vs Troco + Modalidade do Troco */}
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-800/60 space-y-3 text-xs">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tipoJogo === 'troco'}
                  onChange={(e) => {
                    const nextTipo = e.target.checked ? 'troco' : 'normal';
                    setTipoJogo(nextTipo);
                    if (nextTipo === 'normal' && modalidadeTroco !== modalidade) {
                      setSelectedNumbers([]);
                    }
                  }}
                  className="mt-0.5 w-4 h-4 shrink-0"
                />
                <div>
                  <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-600" />
                    Registrar como Jogo de Troco (sem cotas)
                  </span>
                  <span className="text-amber-900/80 dark:text-amber-300/80 block mt-0.5">
                    Aposta extra feita com a sobra do caixa (na mesma loteria ou em outra categoria, como Quina ou Lotofácil). O prêmio é dividido <strong>igualmente</strong> entre todos os participantes pagos.
                  </span>
                </div>
              </label>

              {tipoJogo === 'troco' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-amber-200/80">
                  <label className="font-semibold text-amber-950">
                    Categoria / Loteria do troco:
                    <select
                      value={modalidadeTroco}
                      onChange={(e) => {
                        const nova = e.target.value;
                        setModalidadeTroco(nova);
                        setSelectedNumbers([]);
                        if (nova === modalidade) {
                          setConcursoTroco(concursoBolao);
                        }
                      }}
                      className="block w-full mt-1 px-2.5 py-2 rounded-lg border border-amber-300 bg-white text-slate-900 text-xs"
                    >
                      {GRUPOS_MODALIDADES.map((g) => (
                        <optgroup key={g.grupo} label={g.grupo}>
                          {g.opcoes.map((id) => (
                            <option key={id} value={id}>
                              {CATALOGO_MODALIDADES[id]?.icone} {id}
                              {id === modalidade ? ' (mesma do bolão)' : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>

                  <label className="font-semibold text-amber-950">
                    Concurso desta aposta:
                    {trocoLotteryInfo?.opcoesConcursos?.length ? (
                      <select
                        value={String(concursoTroco)}
                        onChange={(e) => setConcursoTroco(Number(e.target.value))}
                        className="block w-full mt-1 px-2.5 py-2 rounded-lg border border-amber-300 bg-white text-slate-900 text-xs"
                      >
                        {!trocoLotteryInfo.opcoesConcursos.some(
                          (o) => o.numero === concursoTroco,
                        ) && (
                          <option value={String(concursoTroco)}>
                            Concurso #{concursoTroco}
                          </option>
                        )}
                        {trocoLotteryInfo.opcoesConcursos.map((op) => (
                          <option key={op.numero} value={String(op.numero)}>
                            {op.rotulo}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        value={concursoTroco}
                        onChange={(e) =>
                          setConcursoTroco(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="block w-full mt-1 px-2.5 py-2 rounded-lg border border-amber-300 bg-white text-slate-900 text-xs font-mono"
                      />
                    )}
                  </label>
                </div>
              )}
            </div>

            <div
              className={`grid gap-1.5 sm:gap-2 ${
                universo <= 25
                  ? 'grid-cols-5'
                  : universo <= 50
                    ? 'grid-cols-5 sm:grid-cols-10'
                    : universo <= 60
                      ? 'grid-cols-6 sm:grid-cols-10'
                      : 'grid-cols-8 sm:grid-cols-10'
              }`}
            >
              {Array.from({ length: universo }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedNumbers.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleNumber(num)}
                    aria-label={`Número ${num < 10 ? `0${num}` : num} ${isSelected ? 'selecionado' : ''}`}
                    className={`h-11 sm:h-10 w-full text-sm font-bold font-mono rounded-xl transition-all flex items-center justify-center select-none active:scale-95 touch-manipulation ${
                      isSelected
                        ? tipoJogo === 'troco'
                          ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400 scale-[1.03]'
                          : 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400 scale-[1.03]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {num < 10 ? `0${num}` : num}
                  </button>
                );
              })}
            </div>

            {/* Campos de Foto, Autenticação e Observação */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="text-sm text-slate-600">
                <p className="text-xs font-medium mb-1">
                  {fotoUrl ? '✅ Foto anexada e pronta.' : 'Comprovante fotográfico:'}
                </p>
                <button
                  type="button"
                  className="btn text-xs w-full"
                  onClick={() => setIsOcrOpen(true)}
                >
                  {fotoUrl ? 'Trocar / revisar foto' : 'Fotografar ou anexar bilhete'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Código de Controle (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: 8492-1049-5832"
                  value={codigoBilhete}
                  onChange={(e) => setCodigoBilhete(e.target.value)}
                  className="w-full text-sm sm:text-xs px-3 py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Observação opcional (ex.: origem do troco ou palpite do grupo):
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder={
                    tipoJogo === 'troco'
                      ? 'Ex.: Jogo extra feito com os R$ 6,00 de troco do bolão'
                      : 'Ex.: Jogo montado com os palpites mais votados'
                  }
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full text-sm sm:text-xs px-3 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Rodapé de Salvar */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
            {!isValid ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle size={15} />
                <span>
                  {count < minDezenas
                    ? `Faltam ${minDezenas - count} dezenas para o mínimo`
                    : `Máximo de ${maxDezenas} atingido`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Check size={16} />
                <span>
                  {tipoJogo === 'troco' ? 'Jogo de troco pronto' : 'Jogo pronto'} ({count} dezenas)
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={!isValid || saving}
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                isValid
                  ? tipoJogo === 'troco'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 shadow-emerald-600/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              {saving ? 'Salvando…' : tipoJogo === 'troco' ? 'Salvar Jogo de Troco' : 'Salvar Jogo no Bolão'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de OCR */}
      <TicketOcrModal
        modalidade={effectiveModalidade}
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onDezenasConfirmadas={handleOcrResult}
      />
    </>
  );
};
