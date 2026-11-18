import React, { useEffect, useRef, useState } from "react";
import {
  parseCaixaTicketText,
  preprocessTicketImage,
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
  const [image, setImage] = useState(""),
    [text, setText] = useState(""),
    [edit, setEdit] = useState("");
  const [candidates, setCandidates] = useState<
    ReturnType<typeof parseCaixaTicketText>
  >([]);
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const worker = useRef<any>(null),
    active = useRef(true),
    fileInput = useRef<HTMLInputElement>(null);
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
    if (!found.length)
      setError(
        "Não foi identificado um jogo completo. Digite as dezenas visíveis no original; datas e valores não são apostas.",
      );
    else setError("");
  }
  async function read(file: File) {
    if (busy) return;
    setError("");
    setConfirmed(false);
    setEdit("");
    setCandidates([]);
    setImage("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError(
        "Selecione uma foto JPG, PNG ou WebP de até 2 MB. O arquivo original será preservado.",
      );
      return;
    }
    setBusy(true);
    try {
      const original = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      if (!active.current) return;
      setImage(original);
      const processed = await preprocessTicketImage(file);
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
      }
    } catch {
      if (active.current)
        setError(
          "O reconhecimento não funcionou. O original foi preservado: digite e confira as dezenas abaixo.",
        );
    } finally {
      await worker.current?.terminate();
      worker.current = null;
      if (active.current) setBusy(false);
    }
  }
  function confirm() {
    try {
      const numbers = edit
        .trim()
        .split(/[\s,;]+/)
        .map(Number);
      validarDezenas(numbers, modalidade);
      if (!confirmed) throw new Error("Confirme a revisão no original.");
      onDezenasConfirmadas(
        numbers.sort((a, b) => a - b),
        image || undefined,
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ler e conferir comprovante"
      className="fixed inset-0 z-50 bg-black/75 p-3 flex items-center justify-center"
    >
      <div className="bg-white text-slate-900 rounded-2xl p-5 w-full max-w-2xl max-h-[92dvh] overflow-auto space-y-4">
        <header className="flex justify-between items-center gap-4">
          <h2 className="text-xl font-bold">Ler e conferir comprovante</h2>
          <button className="btn" aria-label="Fechar leitor" onClick={onClose}>
            ×
          </button>
        </header>
        <p>
          {info.nome}: {info.minimoDezenas} a {info.maximoDezenas} dezenas de 1
          a {info.universoNumeros}.
        </p>
        <input
          ref={fileInput}
          aria-label="Foto original do comprovante"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files?.[0]) void read(e.target.files[0]);
          }}
        />
        <p className="text-xs">
          Até 2 MB por foto. O OCR usa uma cópia tratada; o original é mantido e
          fica disponível somente ao organizador.
        </p>
        {busy && (
          <p role="status">
            Lendo a imagem… a primeira leitura pode levar alguns instantes.
          </p>
        )}
        {image && (
          <img
            src={image}
            alt="Original para conferir as dezenas"
            className="max-h-72 w-full object-contain border rounded-xl"
          />
        )}
        <label className="block">
          Texto do comprovante
          <textarea
            aria-label="Texto do comprovante"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="block border rounded-lg p-3 w-full mt-2"
          />
        </label>
        <button className="btn" disabled={busy} onClick={() => parse(text)}>
          Extrair dezenas do texto
        </button>
        {candidates.length > 1 && (
          <label className="block">
            Jogo identificado
            <select
              aria-label="Jogo identificado"
              className="border p-2 ml-2"
              onChange={(e) => {
                setEdit(candidates[Number(e.target.value)].dezenas.join(" "));
                setConfirmed(false);
              }}
            >
              {candidates.map((c, i) => (
                <option key={i} value={i}>
                  Jogo {i + 1}: {c.dezenas.join(" ")}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          Dezenas revisadas
          <input
            aria-label="Dezenas revisadas"
            value={edit}
            onChange={(e) => {
              setEdit(e.target.value);
              setConfirmed(false);
            }}
            className="block border rounded-lg w-full p-3 mt-2"
            placeholder="Separadas por espaço"
          />
        </label>
        <label className="flex gap-3 items-start">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span>
            Comparei todas as dezenas com o comprovante original. O OCR não
            autentica o bilhete.
          </span>
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          className="btn primary"
          disabled={busy || !confirmed}
          onClick={confirm}
        >
          Usar dezenas e foto original
        </button>
      </div>
    </div>
  );
}
