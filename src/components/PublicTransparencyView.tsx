import React from "react";
import type { PoolResponse } from "../hooks/usePool";
import { ResultadoView, currency } from "./PainelConferencia";
import { BrandLogo } from "./BrandLogo";
export function PublicTransparencyView({
  data,
  onReload,
}: {
  data: PoolResponse;
  onReload: () => void;
}) {
  const { bolao, jogos, participantes, resumo } = data;
  const own = participantes[0];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white">
        <div className="page py-7 flex gap-4 items-center">
          <BrandLogo size={40} />
          <div className="min-w-0">
            <p className="text-emerald-300 text-sm">
              Transparência do bolão · somente leitura
            </p>
            <h1 className="text-2xl font-bold break-words">{bolao.nome}</h1>
          </div>
        </div>
      </header>
      <main className="page py-7 space-y-5">
        <div className="card">
          <p>
            {bolao.modalidade} · Concurso {bolao.concurso_numero}
          </p>
          <p>Prazo: {new Date(bolao.data_limite).toLocaleString("pt-BR")}</p>
          <p>
            {bolao.fechado_em || Date.now() >= Date.parse(bolao.data_limite)
              ? "Participações encerradas"
              : "Participações abertas"}
          </p>
          <p className="mt-3">
            {resumo?.participantes} participantes · {resumo?.cotas_pagas} de{" "}
            {resumo?.cotas} cotas confirmadas · {jogos.length} jogos
          </p>
          <button className="btn mt-3" onClick={onReload}>
            Atualizar informações
          </button>
          <p className="text-xs mt-2">
            Atualização automática a cada 30 segundos enquanto esta página está
            visível.
          </p>
        </div>
        {own && (
          <section className="card space-y-3">
            <h2 className="text-xl font-bold">Sua participação, {own.nome}</h2>
            <p>
              {own.qtd_cotas} cota(s) · {own.status_pagamento}
            </p>
            <p>Valor das cotas: {currency(own.qtd_cotas * bolao.valor_cota)}</p>
            {bolao.resultado && (
              <p>Seu rateio: {currency(data.rateioPessoal || 0)}</p>
            )}
            <p className="break-all">
              PIX informado pelo organizador: {bolao.chave_pix_organizador}
            </p>
            <p className="text-sm">
              Envie o comprovante diretamente ao organizador. A confirmação do
              pagamento é manual.
            </p>
          </section>
        )}
        <ResultadoView bolao={bolao} jogos={jogos} />
        <section className="card space-y-4">
          <h2 className="text-xl font-bold">Jogos registrados</h2>
          {jogos.length === 0 ? (
            <p>Nenhum jogo registrado.</p>
          ) : (
            jogos.map((j, i) => (
              <div key={j.id}>
                <h3 className="font-semibold mb-2">Jogo {i + 1}</h3>
                <div className="flex flex-wrap gap-2">
                  {j.dezenas.map((n) => (
                    <span className="number-ball" key={n}>
                      {String(n).padStart(2, "0")}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
          <p className="text-sm">
            O cadastro não comprova a compra da aposta. Solicite ao organizador
            a conferência do recibo original. Fotos completas ficam restritas ao
            organizador para proteger dados e códigos do bilhete.
          </p>
        </section>
        <section className="card">
          <h2 className="text-xl font-bold mb-3">Regras do grupo</h2>
          <ul className="list-disc pl-5 space-y-2">
            {bolao.regras?.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <p className="text-sm mt-4">
            A participação neste grupo é diferente de adquirir uma cota oficial
            emitida pela Caixa. Esta plataforma não recebe apostas ou
            pagamentos.
          </p>
        </section>
      </main>
    </div>
  );
}
