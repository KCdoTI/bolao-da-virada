import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImageUp,
  RotateCw,
  RefreshCw,
  CheckCircle2,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import {
  extractCaixaTicketMetadata,
  parseCaixaTicketText,
  prepareReceiptImage,
  preprocessDataUrlForOcr,
} from "../utils/lotteryOcrParser";
import { getModalidadeInfo } from "../constants/lotteryCatalog";
import { validarDezenas } from "../utils/validation";
import { useModalFocus } from "../hooks/useModalFocus";

interface EditableBatchRow {
  id: string;
  label: string;
  selected: boolean;
  text: string;
}

export function TicketOcrModal({
  isOpen,
  onClose,
  onDezenasConfirmadas,
  onMultiplosJogosConfirmados,
  modalidade = "Mega-Sena",
}: {
  isOpen: boolean;
  onClose: () => void;
  onDezenasConfirmadas: (
    n: number[],
    image?: string,
    codigoBilhete?: string,
  ) => void;
  onMultiplosJogosConfirmados?: (
    listaDezenas: number[][],
    image?: string,
    codigoBilhete?: string,
  ) => Promise<boolean> | void;
  modalidade?: string;
}) {
  const [rawSource, setRawSource] = useState<File | string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [image, setImage] = useState("");
  const [text, setText] = useState("");
  const [codigoBilhete, setCodigoBilhete] = useState("");
  const [metaResumo, setMetaResumo] = useState("");

  // Modo 1 jogo
  const [edit, setEdit] = useState("");
  // Modo múltiplos jogos no mesmo bilhete (ex.: Bolão Caixa A, B, C, D, E)
  const [batchRows, setBatchRows] = useState<EditableBatchRow[]>([]);

  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  const worker = useRef<any>(null);
  const active = useRef(true);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const info = getModalidadeInfo(modalidade);

  useModalFocus(isOpen, onClose);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      void worker.current?.terminate();
    };
  }, []);

  if (!isOpen) return null;

  function applyParsedResult(value: string) {
    const found = parseCaixaTicketText(value, modalidade);
    const meta = extractCaixaTicketMetadata(value);
    if (meta.codigoBilhete) {
      setCodigoBilhete(meta.codigoBilhete);
    }
    const tags: string[] = [];
    if (meta.concurso) tags.push(`Concurso #${meta.concurso}`);
    if (meta.combinadaDezenas) tags.push(`Combinada ${meta.combinadaDezenas} dezenas`);
    if (meta.cotaBolaoCaixa) tags.push(`Cota ${meta.cotaBolaoCaixa}`);
    setMetaResumo(tags.join(" · "));

    setConfirmed(false);

    if (found.length > 1) {
      setBatchRows(
        found.map((c, idx) => ({
          id: `row-${idx}`,
          label: `Jogo ${String.fromCharCode(65 + (idx % 26))}`,
          selected: true,
          text: c.dezenas.map((n) => String(n).padStart(2, "0")).join(" "),
        })),
      );
      setEdit(
        found[0].dezenas.map((n) => String(n).padStart(2, "0")).join(" "),
      );
      setError("");
    } else if (found.length === 1) {
      setBatchRows([]);
      setEdit(
        found[0].dezenas.map((n) => String(n).padStart(2, "0")).join(" "),
      );
      setError("");
    } else {
      setBatchRows([]);
      setEdit("");
      setError(
        "Não foi identificado um jogo completo automaticamente. Digite as dezenas visíveis na foto abaixo ou gire a imagem se estiver deitada.",
      );
    }
  }

  async function executeOcrPipeline(source: File | string, rotDeg: number) {
    setBusy(true);
    setStatusMsg("Removendo marca d'água azul e lendo dezenas do comprovante…");
    setError("");
    try {
      const [preparedStorage, processedOcr] = await Promise.all([
        prepareReceiptImage(source, rotDeg),
        preprocessDataUrlForOcr(source, rotDeg),
      ]);
      if (!active.current) return;
      setImage(preparedStorage);

      const { createWorker, PSM } = await import("tesseract.js");
      const w = await createWorker("eng");
      worker.current = w;
      if (!active.current) {
        await w.terminate();
        return;
      }
      await w.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_char_whitelist:
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ -./:$,*",
      });
      const result = await w.recognize(processedOcr);
      if (active.current) {
        setText(result.data.text);
        applyParsedResult(result.data.text);
        setStatusMsg("Leitura concluída! Confira as dezenas abaixo antes de salvar.");
      }
    } catch {
      if (active.current) {
        setError(
          "A leitura automática falhou, mas sua foto já está pronta para salvar. Digite as dezenas abaixo.",
        );
      }
    } finally {
      await worker.current?.terminate();
      worker.current = null;
      if (active.current) setBusy(false);
    }
  }

  async function handleSelectFile(file: File) {
    if (busy) return;
    setError("");
    setStatusMsg("");
    setConfirmed(false);
    setEdit("");
    setBatchRows([]);
    setCodigoBilhete("");
    setMetaResumo("");
    setRotation(0);

    if (
      !file.type.startsWith("image/") &&
      !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
    ) {
      setError("Selecione um arquivo de imagem válido (foto da câmera ou galeria).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("A imagem excede 15 MB. Tire uma foto mais próxima do comprovante.");
      return;
    }

    setRawSource(file);
    await executeOcrPipeline(file, 0);
  }

  async function handleRotate90() {
    if ((!rawSource && !image) || busy) return;
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    await executeOcrPipeline(rawSource || image, nextRot);
  }

  function parseDezenasString(raw: string): number[] {
    const numbers = raw
      .trim()
      .split(/[\s,;\-]+/)
      .filter(Boolean)
      .map(Number);
    validarDezenas(numbers, modalidade);
    return [...numbers].sort((a, b) => a - b);
  }

  function handleConfirmSingle() {
    try {
      const sorted = parseDezenasString(edit);
      if (!confirmed)
        throw new Error("Marque a caixa confirmando que conferiu as dezenas com o recibo.");
      onDezenasConfirmadas(
        sorted,
        image || undefined,
        codigoBilhete.trim() || undefined,
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleConfirmBatch() {
    try {
      const selecionados = batchRows.filter((r) => r.selected);
      if (selecionados.length === 0) {
        throw new Error("Selecione ao menos um jogo do bilhete para importar.");
      }
      const validados: number[][] = [];
      for (const row of selecionados) {
        try {
          validados.push(parseDezenasString(row.text));
        } catch (err) {
          throw new Error(`${row.label}: ${(err as Error).message}`);
        }
      }
      if (!confirmed) {
        throw new Error(
          "Marque a caixa confirmando que conferiu os jogos extraídos com o recibo impresso.",
        );
      }

      if (validados.length === 1 || !onMultiplosJogosConfirmados) {
        onDezenasConfirmadas(
          validados[0],
          image || undefined,
          codigoBilhete.trim() || undefined,
        );
        onClose();
        return;
      }

      setBusy(true);
      const ok = await onMultiplosJogosConfirmados(
        validados,
        image || undefined,
        codigoBilhete.trim() || undefined,
      );
      setBusy(false);
      if (ok !== false) {
        onClose();
      } else {
        setError("Não foi possível salvar os jogos deste bilhete. Tente novamente.");
      }
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
    }
  }

  const sizeKb = image
    ? Math.max(1, Math.round((image.length * 0.75) / 1024))
    : 0;
  const selectedBatchCount = batchRows.filter((r) => r.selected).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fotografar ou enviar comprovante"
      className="fixed inset-0 z-50 bg-black/75 p-3 flex items-center justify-center"
    >
      <div className="bg-white text-slate-900 rounded-2xl p-5 w-full max-w-2xl max-h-[92dvh] overflow-auto space-y-4">
        <header className="flex justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold">Ler e anexar bilhete da Caixa</h2>
            <p className="text-xs text-slate-600">
              {info.nome}: {info.minimoDezenas} a {info.maximoDezenas} dezenas (1 a{" "}
              {info.universoNumeros}) — lê apostas únicas ou vários jogos (A, B, C...) do mesmo recibo
            </p>
          </div>
          <button
            type="button"
            className="btn"
            aria-label="Fechar leitor"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {/* Botões dedicados: Câmera vs Galeria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleSelectFile(f);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInput}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleSelectFile(f);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => cameraInput.current?.click()}
            className="btn primary w-full justify-center py-3"
          >
            <Camera size={18} />
            <span>Tirar foto com a câmera</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => galleryInput.current?.click()}
            className="btn w-full justify-center py-3"
          >
            <ImageUp size={18} />
            <span>Escolher foto da galeria</span>
          </button>
        </div>

        {statusMsg && (
          <p
            role="status"
            className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{statusMsg}</span>
          </p>
        )}

        {image && (
          <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-emerald-700">
                Comprovante anexado ({sizeKb} KB)
                {metaResumo ? ` · ${metaResumo}` : ""}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRotate90()}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw size={13} />
                  <span>Girar 90° e reler</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void executeOcrPipeline(rawSource || image, rotation)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Reler foto</span>
                </button>
              </div>
            </div>
            <img
              src={image}
              alt="Comprovante para conferir as dezenas"
              className="max-h-72 w-full object-contain rounded-lg bg-white border border-slate-200"
            />
          </div>
        )}

        {/* Código de controle detectado */}
        {(image || codigoBilhete) && (
          <label className="block text-xs font-semibold text-slate-700">
            Código do recibo (extraído automaticamente — editável):
            <input
              type="text"
              value={codigoBilhete}
              onChange={(e) => setCodigoBilhete(e.target.value)}
              placeholder="Ex.: A424-A40057C1855A1B6C99-8"
              className="block border border-slate-300 rounded-lg w-full p-2.5 mt-1 font-mono text-xs"
            />
          </label>
        )}

        {/* MODO LOTE: Vários jogos (A, B, C, D, E...) encontrados no mesmo comprovante */}
        {batchRows.length > 1 ? (
          <div className="space-y-3 p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-950">
                <Layers size={18} className="text-emerald-700" />
                <strong className="text-sm">
                  {batchRows.length} jogos identificados neste comprovante!
                </strong>
              </div>
              <button
                type="button"
                onClick={() =>
                  setBatchRows((prev) => [
                    ...prev,
                    {
                      id: `row-${Date.now()}`,
                      label: `Jogo ${String.fromCharCode(65 + (prev.length % 26))}`,
                      selected: true,
                      text: "",
                    },
                  ])
                }
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Adicionar linha</span>
              </button>
            </div>

            <p className="text-xs text-slate-700">
              Confira cada linha com a foto acima (se algum número divergir, você
              pode editar direto na caixinha) e salve todos os jogos de uma só vez:
            </p>

            <div className="space-y-2">
              {batchRows.map((row, idx) => (
                <div
                  key={row.id}
                  className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) =>
                      setBatchRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, selected: e.target.checked } : r,
                        ),
                      )
                    }
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="text-xs font-extrabold text-emerald-900 w-14 shrink-0">
                    {row.label}
                  </span>
                  <input
                    aria-label={`Dezenas do ${row.label}`}
                    value={row.text}
                    onChange={(e) => {
                      setConfirmed(false);
                      setBatchRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, text: e.target.value } : r,
                        ),
                      );
                    }}
                    className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold"
                  />
                  <button
                    type="button"
                    aria-label={`Remover ${row.label}`}
                    onClick={() =>
                      setBatchRows((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <label className="flex gap-2.5 items-start text-sm cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 shrink-0"
              />
              <span>
                Conferi os <strong>{selectedBatchCount} jogos</strong> acima com o
                comprovante impresso da Caixa.
              </span>
            </label>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className="btn primary"
                disabled={busy || selectedBatchCount === 0}
                onClick={() => void handleConfirmBatch()}
              >
                {busy
                  ? "Salvando jogos e comprovante…"
                  : `Salvar todos os ${selectedBatchCount} jogos deste bilhete`}
              </button>
              <button
                type="button"
                className="btn text-xs"
                disabled={busy}
                onClick={() => {
                  const first = batchRows.find((r) => r.selected) || batchRows[0];
                  if (first) setEdit(first.text);
                  setBatchRows([]);
                }}
              >
                Usar apenas 1 jogo no volante
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          /* MODO 1 JOGO */
          <>
            <label className="block text-sm font-semibold">
              Dezenas revisadas (separadas por espaço)
              <input
                aria-label="Dezenas revisadas"
                value={edit}
                onChange={(e) => {
                  setEdit(e.target.value);
                  setConfirmed(false);
                }}
                className="block border border-slate-300 rounded-lg w-full p-3 mt-1.5 font-mono text-base"
                placeholder={`Ex.: ${Array.from(
                  { length: Math.min(6, info.minimoDezenas) },
                  (_, i) => String((i + 1) * 5).padStart(2, "0"),
                ).join(" ")}`}
              />
            </label>

            <label className="flex gap-2.5 items-start text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 shrink-0"
              />
              <span>
                Conferi as dezenas acima com o comprovante impresso da Caixa.
              </span>
            </label>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={handleConfirmSingle}
              >
                Usar dezenas e anexar foto
              </button>
              <button type="button" className="btn" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </>
        )}

        <details className="text-sm border border-slate-200 rounded-xl p-3">
          <summary className="cursor-pointer font-semibold text-xs text-slate-700">
            Texto bruto lido pelo OCR (avançado — colar ou revisar manualmente)
          </summary>
          <div className="mt-3 space-y-2">
            <textarea
              aria-label="Texto do comprovante"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Se preferir, cole aqui o texto copiado do bilhete…"
              className="block border rounded-lg p-3 w-full text-xs font-mono"
            />
            <button
              type="button"
              className="btn text-xs"
              disabled={busy}
              onClick={() => applyParsedResult(text)}
            >
              Extrair jogos deste texto
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
