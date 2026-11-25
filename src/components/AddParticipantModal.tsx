import React, { useEffect, useState } from "react";
import type { Participante, StatusPagamento } from "../types";
import { Dialog } from "./Dialog";

export function AddParticipantModal({
  isOpen,
  onClose,
  onAdd,
  onEdit,
  bolaoId,
  valorCota,
  participanteEditando = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (p: Omit<Participante, "id">) => Promise<boolean> | void;
  onEdit?: (p: Participante) => Promise<boolean> | void;
  bolaoId: string;
  valorCota: number;
  participanteEditando?: Participante | null;
}) {
  const isEdit = Boolean(participanteEditando);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cotas, setCotas] = useState(1);
  const [status, setStatus] = useState<StatusPagamento>("Pendente");
  const [autoRevertedNotice, setAutoRevertedNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setAutoRevertedNotice(false);
    if (participanteEditando) {
      setNome(participanteEditando.nome);
      setTelefone(participanteEditando.telefone || "");
      setCotas(participanteEditando.qtd_cotas);
      setStatus(participanteEditando.status_pagamento);
    } else {
      setNome("");
      setTelefone("");
      setCotas(1);
      setStatus("Pendente");
    }
  }, [isOpen, participanteEditando]);

  if (!isOpen) return null;

  const handleCotasChange = (nextCotas: number) => {
    const valid = Math.max(1, Math.min(1000000, Math.floor(nextCotas) || 1));
    setCotas(valid);
    if (
      participanteEditando &&
      participanteEditando.status_pagamento === "Pago" &&
      valid > participanteEditando.qtd_cotas
    ) {
      setStatus("Pendente");
      setAutoRevertedNotice(true);
    } else {
      setAutoRevertedNotice(false);
    }
  };

  return (
    <Dialog
      title={isEdit ? "Editar participante" : "Adicionar participante"}
      onClose={onClose}
    >
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
            if (isEdit && participanteEditando && onEdit) {
              ok = await onEdit({
                ...participanteEditando,
                nome: nome.trim(),
                telefone: telefone.trim(),
                qtd_cotas: cotas,
                status_pagamento: status,
              });
            } else {
              ok = await onAdd({
                bolao_id: bolaoId,
                nome: nome.trim(),
                telefone: telefone.trim(),
                qtd_cotas: cotas,
                status_pagamento: status,
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
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

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
              setStatus(e.target.value as StatusPagamento);
              setAutoRevertedNotice(false);
            }}
          >
            <option value="Pendente">Pendente</option>
            <option value="Pago">Pago</option>
          </select>
        </label>

        {autoRevertedNotice && (
          <p className="text-xs p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900">
            Como a quantidade de cotas aumentou (de {participanteEditando?.qtd_cotas} para {cotas}), o status foi ajustado para <strong>Pendente</strong> até a confirmação da diferença. Se já recebeu o valor integral, selecione <strong>Pago</strong> acima.
          </p>
        )}

        <p className="font-semibold">
          Total desta participação:{" "}
          {(cotas * valorCota).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>

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
          <button type="button" className="btn" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
