import React, { useEffect, useRef, useState } from "react";
import { Contact, FileUp, ClipboardPaste, Trash2 } from "lucide-react";
import type { Participante, StatusPagamento } from "../types";
import { obterCotasPagas } from "../utils/lotteryEngine";
import {
  type ContatoImportado,
  isContactPickerSupported,
  parsePastedContactsList,
  parseVCardContacts,
  pickContactsFromDevice,
} from "../utils/contacts";
import { Dialog } from "./Dialog";

export function AddParticipantModal({
  isOpen,
  onClose,
  onAdd,
  onAddBatch,
  onEdit,
  bolaoId,
  valorCota,
  participanteEditando = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (p: Omit<Participante, "id">) => Promise<boolean> | void;
  onAddBatch?: (lista: Omit<Participante, "id">[]) => Promise<boolean> | void;
  onEdit?: (p: Participante) => Promise<boolean> | void;
  bolaoId: string;
  valorCota: number;
  participanteEditando?: Participante | null;
}) {
  const isEdit = Boolean(participanteEditando);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cotas, setCotas] = useState(1);
  const [cotasPagas, setCotasPagas] = useState(0);
  const [status, setStatus] = useState<StatusPagamento>("Pendente");
  const [autoRevertedNotice, setAutoRevertedNotice] = useState(false);

  // Estados de importação de contatos (Lote C)
  const [batchContacts, setBatchContacts] = useState<ContatoImportado[]>([]);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importFeedback, setImportFeedback] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const vcfInputRef = useRef<HTMLInputElement>(null);
  const cotasInputRef = useRef<HTMLInputElement>(null);
  const supportsDeviceContacts = isContactPickerSupported();

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setImportFeedback("");
    setAutoRevertedNotice(false);
    setBatchContacts([]);
    setShowPasteBox(false);
    setPasteText("");

    if (participanteEditando) {
      const jaPagas = obterCotasPagas(participanteEditando);
      setNome(participanteEditando.nome);
      setTelefone(participanteEditando.telefone || "");
      setCotas(participanteEditando.qtd_cotas);
      setCotasPagas(jaPagas);
      setStatus(jaPagas >= participanteEditando.qtd_cotas ? "Pago" : "Pendente");
    } else {
      setNome("");
      setTelefone("");
      setCotas(1);
      setCotasPagas(0);
      setStatus("Pendente");
    }
  }, [isOpen, participanteEditando]);

  if (!isOpen) return null;

  const applyImportedContacts = (items: ContatoImportado[]) => {
    setError("");
    if (!items.length) {
      setError("Nenhum contato válido encontrado.");
      return;
    }
    if (items.length === 1 || isEdit || !onAddBatch) {
      const c = items[0];
      setNome(c.nome);
      if (c.telefone) setTelefone(c.telefone);
      if (!isEdit && c.cotasSugeridas > 1) setCotas(c.cotasSugeridas);
      setBatchContacts([]);
      setImportFeedback(
        `Contato "${c.nome}" preenchido! Defina abaixo a quantidade de cotas.`,
      );
      setTimeout(() => cotasInputRef.current?.focus(), 60);
    } else {
      setBatchContacts(items);
      setImportFeedback(
        `${items.length} contatos carregados! Ajuste as cotas de cada pessoa abaixo e salve de uma vez.`,
      );
    }
  };

  const handlePickNativeAgenda = async (multiple: boolean) => {
    setError("");
    setImportFeedback("");
    try {
      const picked = await pickContactsFromDevice(multiple);
      if (picked.length > 0) applyImportedContacts(picked);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleVcfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseVCardContacts(text);
      applyImportedContacts(parsed);
    } catch {
      setError("Não foi possível ler o cartão de contato (.vcf).");
    }
  };

  const handleCotasChange = (nextCotas: number) => {
    const valid = Math.max(1, Math.min(1000000, Math.floor(nextCotas) || 1));
    setCotas(valid);
    if (participanteEditando) {
      const pagasOriginais = obterCotasPagas(participanteEditando);
      const novasPagas = Math.min(valid, pagasOriginais);
      setCotasPagas(novasPagas);
      if (pagasOriginais > 0 && valid > pagasOriginais) {
        setStatus("Pendente");
        setAutoRevertedNotice(true);
      } else if (novasPagas >= valid && pagasOriginais > 0) {
        setStatus("Pago");
        setAutoRevertedNotice(false);
      } else {
        setAutoRevertedNotice(false);
      }
    } else {
      setCotasPagas(status === "Pago" ? valid : 0);
      setAutoRevertedNotice(false);
    }
  };

  const totalBatchCotas = batchContacts.reduce(
    (s, c) => s + (c.cotasSugeridas || 1),
    0,
  );

  return (
    <Dialog
      title={isEdit ? "Editar participante" : "Adicionar participante"}
      onClose={onClose}
    >
      {/* Atalhos de Agenda / Cartão de Contato (.vcf) / Lista em Lote */}
      <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
        <p className="text-xs font-bold text-slate-700">
          Buscar dos Contatos do Celular ou WhatsApp:
        </p>

        <div className="flex flex-wrap gap-2">
          {supportsDeviceContacts && (
            <button
              type="button"
              onClick={() => void handlePickNativeAgenda(!isEdit)}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Contact size={14} />
              <span>
                {isEdit ? "Buscar 1 da Agenda" : "Agenda do Celular"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => vcfInputRef.current?.click()}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileUp size={14} className="text-emerald-700" />
            <span>Cartão de Contato (.vcf)</span>
          </button>

          {!isEdit && (
            <button
              type="button"
              onClick={() => setShowPasteBox((v) => !v)}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardPaste size={14} className="text-indigo-600" />
              <span>Colar lista</span>
            </button>
          )}

          <input
            ref={vcfInputRef}
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            className="hidden"
            onChange={handleVcfUpload}
          />
        </div>

        <p className="text-[11px] text-slate-500">
          {supportsDeviceContacts
            ? "Selecione um ou vários contatos direto da agenda do seu Android (só os escolhidos são lidos)."
            : "No iPhone ou WhatsApp: abra o contato → Compartilhar contato → Salvar/Escolher arquivo .vcf, ou cole uma lista abaixo."}
        </p>

        {showPasteBox && !isEdit && (
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <label className="text-xs font-medium block">
              Cole um participante por linha (ex.: <code>Nome - WhatsApp - Cotas</code>):
              <textarea
                rows={3}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"Mariana Silva - (11) 98765-4321 - 2\nCarlos Lima; 21999887766; 1"}
                className="w-full mt-1 p-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                applyImportedContacts(parsePastedContactsList(pasteText));
                setShowPasteBox(false);
              }}
              className="btn text-xs py-1.5 px-3"
            >
              Carregar participantes da lista
            </button>
          </div>
        )}

        {importFeedback && (
          <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
            {importFeedback}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="error mb-3">
          {error}
        </p>
      )}

      {/* MODO LOTE: Múltiplos contatos importados de uma só vez */}
      {batchContacts.length > 0 && !isEdit && onAddBatch ? (
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {batchContacts.map((c, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
              >
                <div className="sm:col-span-5">
                  <input
                    aria-label={`Nome do contato ${idx + 1}`}
                    value={c.nome}
                    onChange={(e) =>
                      setBatchContacts((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, nome: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>
                <div className="sm:col-span-4">
                  <input
                    aria-label={`WhatsApp do contato ${idx + 1}`}
                    value={c.telefone}
                    placeholder="WhatsApp"
                    onChange={(e) =>
                      setBatchContacts((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? { ...item, telefone: e.target.value }
                            : item,
                        ),
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-1">
                  <input
                    aria-label={`Cotas de ${c.nome}`}
                    type="number"
                    min="1"
                    max="1000"
                    value={c.cotasSugeridas}
                    onChange={(e) =>
                      setBatchContacts((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                cotasSugeridas: Math.max(
                                  1,
                                  Number(e.target.value) || 1,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-center"
                  />
                  <span className="text-[10px] text-slate-500">cotas</span>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    aria-label={`Remover ${c.nome} da importação`}
                    onClick={() =>
                      setBatchContacts((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm font-semibold">
            Resumo do lote: <strong>{batchContacts.length}</strong> pessoa(s) ·{" "}
            <strong>{totalBatchCotas}</strong> cota(s) · Total:{" "}
            {(totalBatchCotas * valorCota).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const validos = batchContacts.filter((c) => c.nome.trim());
                if (!validos.length) {
                  setError("Informe ao menos um participante com nome.");
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  const now = new Date().toISOString();
                  const ok = await onAddBatch(
                    validos.map((c) => ({
                      bolao_id: bolaoId,
                      nome: c.nome.trim(),
                      telefone: c.telefone.trim(),
                      qtd_cotas: Math.max(1, c.cotasSugeridas || 1),
                      status_pagamento: "Pendente" as const,
                      data_registro: now,
                    })),
                  );
                  if (ok === false) {
                    setError("Não foi possível salvar o lote. Tente novamente.");
                  }
                } finally {
                  setBusy(false);
                }
              }}
              className="btn primary"
            >
              {busy
                ? "Adicionando…"
                : `Adicionar ${batchContacts.length} participantes`}
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                setBatchContacts([]);
                setImportFeedback("");
              }}
            >
              Voltar ao cadastro individual
            </button>
          </div>
        </div>
      ) : (
        /* MODO INDIVIDUAL / EDIÇÃO */
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            if (!nome.trim()) {
              setError("Informe o nome do participante.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              let ok: boolean | void;
              const finalCotasPagas =
                status === "Pago" ? cotas : Math.max(0, Math.min(cotas, cotasPagas));
              const finalStatus: StatusPagamento =
                finalCotasPagas >= cotas ? "Pago" : "Pendente";

              if (isEdit && participanteEditando && onEdit) {
                ok = await onEdit({
                  ...participanteEditando,
                  nome: nome.trim(),
                  telefone: telefone.trim(),
                  qtd_cotas: cotas,
                  cotas_pagas: finalCotasPagas,
                  status_pagamento: finalStatus,
                });
              } else {
                ok = await onAdd({
                  bolao_id: bolaoId,
                  nome: nome.trim(),
                  telefone: telefone.trim(),
                  qtd_cotas: cotas,
                  cotas_pagas: finalCotasPagas,
                  status_pagamento: finalStatus,
                  data_registro: new Date().toISOString(),
                });
              }
              if (ok === false) {
                setError(
                  "Não foi possível salvar. Recarregue o painel se outra sessão alterou o bolão.",
                );
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nome do participante
            <input
              required
              maxLength={120}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Mariana Silva"
            />
          </label>

          <label>
            Telefone / WhatsApp (opcional)
            <input
              type="tel"
              maxLength={30}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Ex.: (11) 98765-4321"
            />
          </label>

          <label>
            Quantidade de cotas
            <input
              ref={cotasInputRef}
              required
              type="number"
              min="1"
              max="1000000"
              step="1"
              value={cotas}
              onChange={(e) => handleCotasChange(Number(e.target.value))}
            />
          </label>

          <label>
            Status do pagamento
            <select
              value={status}
              onChange={(e) => {
                const nextSt = e.target.value as StatusPagamento;
                setStatus(nextSt);
                if (nextSt === "Pago") {
                  setCotasPagas(cotas);
                } else if (participanteEditando) {
                  const origPagas = obterCotasPagas(participanteEditando);
                  setCotasPagas(origPagas < cotas ? origPagas : 0);
                } else {
                  setCotasPagas(0);
                }
                setAutoRevertedNotice(false);
              }}
            >
              <option value="Pendente">
                {cotasPagas > 0 && cotasPagas < cotas
                  ? `Pendente apenas da diferença (+${cotas - cotasPagas} cota(s))`
                  : "Pendente"}
              </option>
              <option value="Pago">Pago (todas as {cotas} cota(s) quitadas)</option>
            </select>
          </label>

          {cotasPagas > 0 && cotasPagas < cotas && status === "Pendente" && (
            <div className="text-xs p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1">
              <p className="font-bold">
                ✅ {cotasPagas} {cotasPagas === 1 ? "cota já está paga" : "cotas já estão pagas"} (
                {(cotasPagas * valorCota).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
                ) — não será cobrada de novo!
              </p>
              <p>
                {autoRevertedNotice
                  ? "Ao salvar, o QR Code PIX e a cobrança pedirão somente a diferença das novas cotas: "
                  : "Falta pagar apenas a diferença: "}
                <strong>
                  +{cotas - cotasPagas} {cotas - cotasPagas === 1 ? "cota" : "cotas"} ={" "}
                  {((cotas - cotasPagas) * valorCota).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </strong>
                .
              </p>
            </div>
          )}

          <div className="space-y-0.5">
            <p className="font-semibold">
              Total reservado ({cotas} {cotas === 1 ? "cota" : "cotas"}):{" "}
              {(cotas * valorCota).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
            {status === "Pendente" && cotasPagas > 0 && cotasPagas < cotas && (
              <p className="text-sm font-bold text-amber-800">
                Valor restante a cobrar agora:{" "}
                {((cotas - cotasPagas) * valorCota).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            )}
          </div>

          <p className="text-sm text-slate-600">
            Marque como pago somente após conferir o recebimento. O horário da
            confirmação e a edição ficam registrados no histórico do bolão.
          </p>

          <div className="flex flex-wrap gap-2">
            <button className="btn primary" disabled={busy}>
              {busy
                ? "Salvando…"
                : isEdit
                  ? "Salvar alterações"
                  : "Adicionar participante"}
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
        </form>
      )}
    </Dialog>
  );
}
