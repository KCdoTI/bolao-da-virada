import React, { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, RotateCw, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  parseCaixaTicketText,
  prepareReceiptImage,
  preprocessDataUrlForOcr,
} from "../utils/lotteryOcrParser";
import { getModalidadeInfo } from "../constants/lotteryCatalog";
import { validarDezenas } from "../utils/validation";
import { useModalFocus } from "../hooks/useModalFocus";

export function TicketOcrModal({
  isOpen,
  onClose,
  onDezenasConfirmadas,
  modalidade = "Mega-Sena",
}: {
  isOpen: boolean;
  onClose: () => void;
  onDezenasConfirmadas: (n: number[], image?: string) => void;
  modalidade?: string;
}) {
  const [image, setImage] = useState("");
  const [text, setText] = useState("");
  const [edit, setEdit] = useState("");
  const [candidates, setCandidates] = useState<
    ReturnType<typeof parseCaixaTicketText>
  >([]);
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

  function parse(value: string) {
    const found = parseCaixaTicketText(value, modalidade);
    setCandidates(found);
    setConfirmed(false);
    setEdit(found[0]?.dezenas.join(" ") || "");
    if (!found.length) {
      setError(
        "Não foi identificado um jogo completo automaticamente. Digite ou ajuste as dezenas visíveis na foto acima.",
      );
    } else {
      setError("");
    }
  }

  async function runOcrOnPreparedImage(preparedDataUrl: string) {
    setBusy(true);
    setStatusMsg("Lendo dezenas do comprovante…");
    setError("");
    try {
      const processed = await preprocessDataUrlForOcr(preparedDataUrl);
      const { createWorker } = await import("tesseract.js");
      const w = await createWorker("por");
      worker.current = w;
      if (!active.current) {
        await w.terminate();
        return;
      }
      const result = await w.recognize(processed);
      if (active.current) {
        setText(result.data.text);
        parse(result.data.text);
        setStatusMsg("Foto tratada e pronta para ser armazenada no bolão.");
      }
    } catch {
      if (active.current) {
        setError(
          "A leitura automática falhou, mas sua foto já está pronta para salvar. Confira e digite as dezenas abaixo.",
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
    setCandidates([]);

    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      setError("Selecione um arquivo de imagem válido (foto da câmera ou galeria).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("A imagem excede 15 MB. Tire uma foto mais próxima do comprovante.");
      return;
    }

    setBusy(true);
    setStatusMsg("Otimizando foto do celular para armazenamento seguro…");
    try {
      const prepared = await prepareReceiptImage(file, 0);
      if (!active.current) return;
      setImage(prepared);
      await runOcrOnPreparedImage(prepared);
    } catch (e) {
      if (active.current) {
        setBusy(false);
        setError(
          (e as Error).message ||
            "Não foi possível processar esta foto. Tente tirar outra foto em formato JPG/PNG.",
        );
      }
    }
  }

  async function handleRotate90() {
    if (!image || busy) return;
    setBusy(true);
    setStatusMsg("Girando comprovante…");
    try {
      const rotated = await prepareReceiptImage(image, 90);
      if (!active.current) return;
      setImage(rotated);
      setStatusMsg("Imagem girada. Se desejar, clique em 'Ler novamente da foto'.");
    } catch (e) {
      if (active.current) setError((e as Error).message);
    } finally {
      if (active.current) setBusy(false);
    }
  }

  function confirm() {
    try {
      const numbers = edit
        .trim()
        .split(/[\s,;\-]+/)
        .filter(Boolean)
        .map(Number);
      validarDezenas(numbers, modalidade);
      if (!confirmed) throw new Error("Marque a confirmação de revisão das dezenas.");
      onDezenasConfirmadas(
        numbers.sort((a, b) => a - b),
        image || undefined,
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sizeKb = image ? Math.max(1, Math.round((image.length * 0.75) / 1024)) : 0;

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
            <h2 className="text-xl font-bold">Ler e anexar bilhete</h2>
            <p className="text-xs text-slate-600">
              {info.nome}: {info.minimoDezenas} a {info.maximoDezenas} dezenas (1 a{" "}
              {info.universoNumeros})
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

        <p className="text-xs text-slate-500">
          Fotos grandes de celular (até 15 MB) são ajustadas automaticamente no
          seu aparelho para ficarem leves e nítidas antes do envio ao servidor.
        </p>

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
                Comprovante anexado ({sizeKb} KB · pronto para guardar)
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRotate90()}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw size={13} />
                  <span>Girar 90°</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runOcrOnPreparedImage(image)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Ler novamente da foto</span>
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

        <details className="text-sm border border-slate-200 rounded-xl p-3">
          <summary className="cursor-pointer font-semibold text-xs text-slate-700">
            Texto lido pelo OCR (opcional — colar ou revisar texto bruto)
          </summary>
          <div className="mt-3 space-y-2">
            <textarea
              aria-label="Texto do comprovante"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Se preferir, cole aqui o texto copiado do bilhete…"
              className="block border rounded-lg p-3 w-full text-xs font-mono"
            />
            <button
              type="button"
              className="btn text-xs"
              disabled={busy}
              onClick={() => parse(text)}
            >
              Extrair dezenas deste texto
            </button>
          </div>
        </details>

        {candidates.length > 1 && (
          <label className="block text-sm font-medium">
            Mais de um jogo identificado no bilhete — escolha qual usar agora:
            <select
              aria-label="Jogo identificado"
              className="border rounded-lg p-2.5 w-full mt-1"
              onChange={(e) => {
                setEdit(candidates[Number(e.target.value)].dezenas.join(" "));
                setConfirmed(false);
              }}
            >
              {candidates.map((c, i) => (
                <option key={i} value={i}>
                  Jogo {i + 1}: {c.dezenas.map((n) => String(n).padStart(2, "0")).join(" - ")}
                </option>
              ))}
            </select>
          </label>
        )}

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
            placeholder={`Ex.: ${Array.from({ length: Math.min(6, info.minimoDezenas) }, (_, i) => String((i + 1) * 5).padStart(2, "0")).join(" ")}`}
          />
        </label>

        <label className="flex gap-3 items-start text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4"
          />
          <span>
            Conferi todas as dezenas com o bilhete físico/foto acima. Estou ciente
            de que o OCR apenas auxilia a digitação.
          </span>
        </label>

        {error && (
          <p role="alert" className="error text-sm">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="btn primary"
            disabled={busy || !confirmed}
            onClick={confirm}
          >
            {image ? "Aplicar dezenas e anexar foto" : "Aplicar dezenas revisadas"}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
