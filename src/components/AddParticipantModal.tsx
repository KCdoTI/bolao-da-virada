import React, { useState } from "react";
import type { Participante, StatusPagamento } from "../types";
import { Dialog } from "./Dialog";
export function AddParticipantModal({
  isOpen,
  onClose,
  onAdd,
  bolaoId,
  valorCota,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (p: Omit<Participante, "id">) => Promise<boolean> | void;
  bolaoId: string;
  valorCota: number;
}) {
  const [nome, setNome] = useState(""),
    [telefone, setTelefone] = useState("");
  const [cotas, setCotas] = useState(1),
    [status, setStatus] = useState<StatusPagamento>("Pendente"),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!isOpen) return null;
  return (
    <Dialog title="Adicionar participante" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            const ok = await onAdd({
              bolao_id: bolaoId,
              nome: nome.trim(),
              telefone: telefone.trim(),
              qtd_cotas: cotas,
              status_pagamento: status,
              data_registro: new Date().toISOString(),
            });
            if (ok === false)
              setError(
                "Não foi possível salvar. Recarregue o painel se outra sessão alterou o bolão.",
              );
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
          Nome
          <input
            required
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>
        <label>
          Telefone / WhatsApp (opcional)
          <input
            type="tel"
            maxLength={30}
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
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
            onChange={(e) => setCotas(Number(e.target.value))}
          />
        </label>
        <label>
          Pagamento
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusPagamento)}
          >
            <option>Pendente</option>
            <option>Pago</option>
          </select>
        </label>
        <p>
          Total:{" "}
          {(cotas * valorCota).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
        <p className="text-sm">
          Marque como pago somente após conferir o recebimento. O horário da
          confirmação será registrado.
        </p>
        <button className="btn primary" disabled={busy}>
          {busy ? "Salvando…" : "Adicionar participante"}
        </button>
      </form>
    </Dialog>
  );
}
