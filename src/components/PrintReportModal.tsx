import React, { useEffect, useState } from "react";
import type { Bolao, Participante, Jogo } from "../types";
import {
  generateCanonicalManifest,
  calculateSha256,
} from "../utils/transparency";
import { Dialog } from "./Dialog";
import { ResultadoView, currency } from "./PainelConferencia";
import { ReceiptImage } from "./ReceiptImage";
export function PrintReportModal({
  isOpen,
  onClose,
  bolao,
  participantes,
  jogos,
}: {
  isOpen: boolean;
  onClose: () => void;
  bolao: Bolao;
  participantes: Participante[];
  jogos: Jogo[];
}) {
  const [digest, setDigest] = useState("Calculando…");
  const [photos, setPhotos] = useState(false);
  const manifest = generateCanonicalManifest(bolao, participantes, jogos);
  useEffect(() => {
    let active = true;
    calculateSha256(manifest)
      .then((v) => {
        if (active) setDigest(v);
      })
      .catch((e) => {
        if (active) setDigest(e.message);
      });
    return () => {
      active = false;
    };
  }, [manifest]);
  if (!isOpen) return null;
  return (
    <Dialog title="Extrato do bolão" onClose={onClose}>
      <article className="print-report space-y-5">
        <div className="print-hidden flex flex-wrap gap-2">
          <button className="btn primary" onClick={() => window.print()}>
            Imprimir / salvar PDF
          </button>
          <button
            className="btn"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([manifest], { type: "application/json" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "manifesto-bolao.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Baixar manifesto
          </button>
          <button className="btn" onClick={() => setPhotos(!photos)}>
            {photos ? "Ocultar fotos" : "Incluir fotos originais"}
          </button>
        </div>
        <h1 className="text-2xl font-bold">{bolao.nome}</h1>
        <p>
          {bolao.modalidade} · Concurso {bolao.concurso_numero}
        </p>
        <p>
          Cota: {currency(bolao.valor_cota)} · Prazo:{" "}
          {new Date(bolao.data_limite).toLocaleString("pt-BR")}
        </p>
        <p>
          {bolao.fechado_em
            ? "Fechado em " + new Date(bolao.fechado_em).toLocaleString("pt-BR")
            : "Rascunho: participações ainda não fechadas."}
        </p>
        <section>
          <h2 className="font-bold text-lg">Participações</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cotas</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {participantes.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.qtd_cotas}</td>
                    <td>
                      {p.status_pagamento}
                      {p.pago_em && (
                        <small className="block">
                          {new Date(p.pago_em).toLocaleString("pt-BR")}
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="font-bold text-lg">Jogos e comprovantes</h2>
          {jogos.map((j, i) => (
            <div className="py-3" key={j.id}>
              <p>
                Jogo {i + 1} {j.tipo_jogo === "troco" ? "(🪙 Troco — Divisão Igual)" : ""}:{" "}
                {j.dezenas.join(" · ")}
              </p>
              {j.observacao && <p className="text-xs italic">{j.observacao}</p>}
              <p>Código do recibo: {j.codigo_bilhete || "não informado"}</p>
              {j.foto_sha256 && (
                <p className="text-xs break-all">
                  Hash do comprovante: {j.foto_sha256}
                </p>
              )}
              {photos && j.foto_url && (
                <ReceiptImage
                  source={j.foto_url}
                  alt={"Comprovante " + (i + 1)}
                  className="w-full max-h-[600px] object-contain"
                />
              )}
            </div>
          ))}
        </section>
        <ResultadoView bolao={bolao} jogos={jogos} />
        <section>
          <h2 className="font-bold">Regras acordadas</h2>
          {bolao.regras?.map((r, i) => (
            <p key={i}>{r}</p>
          ))}
        </section>
        <p className="text-xs break-all">
          SHA-256 do manifesto (versão 2): {digest}
        </p>
        <p className="text-sm">
          O hash detecta mudanças no manifesto, incluindo regras e referência ao
          conteúdo dos comprovantes. Não é assinatura digital, autenticação da
          Caixa ou prova externa da data de registro. Guarde os recibos
          originais.
        </p>
      </article>
    </Dialog>
  );
}
