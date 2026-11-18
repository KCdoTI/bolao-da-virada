import React, { useState } from "react";
import type { Bolao } from "../types";
import { CATALOGO_MODALIDADES } from "../constants/lotteryCatalog";
import { Dialog } from "./Dialog";
function localDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function ConfigurarBolaoModal({
  isOpen,
  onClose,
  bolaoAtual,
  onSalvarBolao,
  busy = false,
  frozen = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  bolaoAtual: Bolao;
  onSalvarBolao: (b: Bolao, reset: boolean) => Promise<boolean> | void;
  busy?: boolean;
  frozen?: boolean;
}) {
  const [draft, setDraft] = useState({
    ...bolaoAtual,
    data_limite: localDate(bolaoAtual.data_limite),
    data_sorteio: localDate(bolaoAtual.data_sorteio),
  });
  const [error, setError] = useState("");
  if (!isOpen) return null;
  const change = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const deadline = new Date(draft.data_limite).toISOString();
      const draw = draft.data_sorteio
        ? new Date(draft.data_sorteio).toISOString()
        : undefined;
      if (!frozen && Date.parse(deadline) <= Date.now())
        throw new Error(
          "Defina um prazo futuro para receber pagamentos e cadastrar jogos.",
        );
      if (draw && Date.parse(deadline) >= Date.parse(draw))
        throw new Error("O prazo do grupo deve anteceder o sorteio.");
      await onSalvarBolao(
        { ...draft, data_limite: deadline, data_sorteio: draw },
        false,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Dialog
      title={bolaoAtual.id === "novo" ? "Criar bolão" : "Configurar bolão"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy || frozen} className="space-y-4">
          <label>
            Nome do bolão
            <input
              required
              maxLength={120}
              value={draft.nome}
              onChange={(e) => change("nome", e.target.value)}
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label>
              Modalidade
              <select
                value={draft.modalidade}
                onChange={(e) => change("modalidade", e.target.value)}
              >
                {Object.keys(CATALOGO_MODALIDADES).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              Número do concurso
              <input
                required
                type="number"
                min="1"
                value={draft.concurso_numero}
                onChange={(e) =>
                  change("concurso_numero", Number(e.target.value))
                }
              />
            </label>
          </div>
          <p className="text-xs">
            Confirme o concurso e a data na Caixa. Mega da Virada 2026: concurso
            3100, sorteio anunciado para 01/01/2027 às 11h de Brasília.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label>
              Prazo de pagamento do grupo
              <input
                required
                type="datetime-local"
                value={draft.data_limite}
                onChange={(e) => change("data_limite", e.target.value)}
              />
            </label>
            <label>
              Data prevista do sorteio (opcional)
              <input
                type="datetime-local"
                value={draft.data_sorteio || ""}
                onChange={(e) => change("data_sorteio", e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs">
            Horários exibidos no fuso deste aparelho. No prazo, a edição de
            participantes, pagamentos e jogos será encerrada automaticamente.
          </p>
          <label>
            Valor por cota (R$)
            <input
              required
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              value={draft.valor_cota}
              onChange={(e) => change("valor_cota", Number(e.target.value))}
            />
          </label>
          <label>
            Nome do organizador
            <input
              maxLength={120}
              value={draft.nome_organizador || ""}
              onChange={(e) => change("nome_organizador", e.target.value)}
            />
          </label>
          <label>
            Chave PIX do organizador
            <input
              maxLength={200}
              value={draft.chave_pix_organizador}
              onChange={(e) => change("chave_pix_organizador", e.target.value)}
            />
          </label>
          <label>
            Regras acordadas com o grupo (uma por linha)
            <textarea
              rows={5}
              value={draft.regras?.join("\n") || ""}
              onChange={(e) =>
                change("regras", e.target.value.split("\n").filter(Boolean))
              }
            />
          </label>
        </fieldset>
        {frozen && (
          <p>
            Participações encerradas. As condições deste bolão estão congeladas.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!frozen && (
          <button className="btn primary" disabled={busy}>
            {busy
              ? "Salvando…"
              : bolaoAtual.id === "novo"
                ? "Criar e guardar bolão"
                : "Salvar configurações"}
          </button>
        )}
      </form>
    </Dialog>
  );
}
