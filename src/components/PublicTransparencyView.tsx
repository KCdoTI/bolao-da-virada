import React from "react";
import { Calendar, ExternalLink } from "lucide-react";
import type { PoolResponse } from "../hooks/usePool";
import { useLotteryInfo } from "../hooks/useLotteryInfo";
import { ResultadoView, currency } from "./PainelConferencia";
import { BrandLogo } from "./BrandLogo";
import { getModalidadeInfo, LOTTERY_SOURCES } from "../constants/lotteryCatalog";

export function PublicTransparencyView({
  data,
  onReload,
}: {
  data: PoolResponse;
  onReload: () => void;
}) {
  const { bolao, jogos, participantes, resumo } = data;
  const own = participantes[0];
  const info = getModalidadeInfo(bolao.modalidade);
  const { lotteryInfo } = useLotteryInfo(bolao.modalidade, true);
  const officialUrl =
    LOTTERY_SOURCES[info.modalidadeBase as keyof typeof LOTTERY_SOURCES] ||
    "https://loterias.caixa.gov.br/";

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
        <div className="card space-y-2">
          <p className="font-semibold text-lg">
            {info.icone} {bolao.modalidade} · Concurso #{bolao.concurso_numero} · Cota:{" "}
            {currency(bolao.valor_cota)}
          </p>
          <p className="text-sm">
            Prazo limite de pagamento:{" "}
            <strong>{new Date(bolao.data_limite).toLocaleString("pt-BR")}</strong>
          </p>
          {(bolao.data_sorteio ||
            lotteryInfo?.proximoConcurso.numero === bolao.concurso_numero) && (
            <p className="text-sm text-emerald-800 font-medium flex items-center gap-1.5">
              <Calendar size={14} />
              <span>
                Data prevista do sorteio:{" "}
                <strong>
                  {bolao.data_sorteio
                    ? new Date(bolao.data_sorteio).toLocaleString("pt-BR")
                    : lotteryInfo?.proximoConcurso.dataProximoConcurso}
                </strong>
              </span>
            </p>
          )}
          <p className="text-sm font-medium">
            Status:{" "}
            {bolao.fechado_em || Date.now() >= Date.parse(bolao.data_limite)
              ? "Participações encerradas"
              : "Participações abertas"}
          </p>
          <p className="pt-1 text-sm">
            {resumo?.participantes} participante(s) · {resumo?.cotas_pagas} de{" "}
            {resumo?.cotas} cota(s) confirmada(s) · {jogos.length} jogo(s)
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="btn" onClick={onReload}>
              Atualizar informações
            </button>
            <a
              className="btn"
              href={officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>Portal Loterias Caixa</span>
              <ExternalLink size={14} />
            </a>
          </div>
          <p className="text-xs text-slate-500">
            Atualização automática a cada 30 segundos enquanto esta página está
            visível.
          </p>
        </div>

        {/* Informações atualizadas da Caixa para os participantes */}
        {lotteryInfo && !bolao.resultado && (
          <section className="card bg-emerald-50/60 border-emerald-200 space-y-1 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Informações atualizadas das Loterias Caixa
            </p>
            <p>
              Concurso em aberto na Caixa:{" "}
              <strong>
                #{lotteryInfo.proximoConcurso.numero} (sorteio{" "}
                {lotteryInfo.proximoConcurso.dataProximoConcurso})
              </strong>
              {lotteryInfo.proximoConcurso.valorEstimado > 0 && (
                <>
                  {" "}
                  · Prêmio estimado:{" "}
                  <strong className="text-emerald-800">
                    {currency(lotteryInfo.proximoConcurso.valorEstimado)}
                  </strong>
                </>
              )}
              {lotteryInfo.ultimoConcurso.acumulado && " · Acumulado!"}
            </p>
          </section>
        )}

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
