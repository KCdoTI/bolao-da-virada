import React, { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Lightbulb,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { PoolResponse } from "../hooks/usePool";
import { useLotteryInfo } from "../hooks/useLotteryInfo";
import { ResultadoView, currency } from "./PainelConferencia";
import { BrandLogo } from "./BrandLogo";
import { getModalidadeInfo, LOTTERY_SOURCES } from "../constants/lotteryCatalog";
import { obterCotasPagas, obterCotasPendentes } from "../utils/lotteryEngine";
import { gerarPayloadPixEstatico, gerarQrCodePixSvg } from "../utils/pix";

export function PublicTransparencyView({
  data,
  busy = false,
  onReload,
  onParticipantAction,
}: {
  data: PoolResponse;
  busy?: boolean;
  onReload: () => void;
  onParticipantAction?: (
    action:
      | "inscrever_publico"
      | "aceitar_regras"
      | "informar_pagamento"
      | "enviar_palpite"
      | "remover_palpite",
    payload?: any,
  ) => Promise<boolean>;
}) {
  const { bolao, jogos, participantes, resumo } = data;
  const own = participantes[0];
  const info = getModalidadeInfo(bolao.modalidade);
  const { lotteryInfo } = useLotteryInfo(bolao.modalidade, true);

  const frozen =
    !!bolao.fechado_em || Date.now() >= Date.parse(bolao.data_limite);

  const cotasJaPagas = own ? obterCotasPagas(own) : 0;
  const cotasRestantes = own ? obterCotasPendentes(own) : 0;
  const isFullyPaid = Boolean(own && cotasRestantes === 0 && cotasJaPagas > 0);
  const isPaid = Boolean(own && cotasJaPagas > 0);
  const hasAccepted = Boolean(
    own &&
      (own.aceite_em || cotasJaPagas > 0) &&
      (!own.regras_aceitas_hash ||
        !data.regrasHash ||
        own.regras_aceitas_hash === data.regrasHash),
  );
  const transparenciaLiberada = Boolean(data.transparenciaLiberada && isPaid);

  // Etapa atual do participante: 1 = Aceite, 2 = Pagamento PIX (total ou diferença), 3 = Transparência completa
  const currentStep = !own
    ? 1
    : isFullyPaid
      ? 3
      : hasAccepted
        ? 2
        : 1;

  // Estados de Aceite e Auto-inscrição
  const [checkedRules, setCheckedRules] = useState(false);
  const [inscNome, setInscNome] = useState("");
  const [inscTelefone, setInscTelefone] = useState("");
  const [inscCotas, setInscCotas] = useState(1);

  // Estados de QR Code PIX
  const [pixPayload, setPixPayload] = useState("");
  const [pixSvg, setPixSvg] = useState("");
  const [copiedPixCode, setCopiedPixCode] = useState(false);
  const [copiedPixKey, setCopiedPixKey] = useState(false);
  const [actionFeedback, setActionFeedback] = useState("");

  // Estados de Palpites (100% opcionais e com quantidade flexível de dezenas)
  const [palpiteNums, setPalpiteNums] = useState<number[]>([]);
  const [qtdSurpresinha, setQtdSurpresinha] = useState<number>(info.minimoDezenas);
  const [palpiteAberto, setPalpiteAberto] = useState(false);
  const [dispensouPalpite, setDispensouPalpite] = useState(false);
  const palpitesLista = data.palpites || [];
  const meusPalpites = own
    ? palpitesLista.filter((p) => p.is_meu || p.participante_id === own.id)
    : [];

  useEffect(() => {
    setQtdSurpresinha(info.minimoDezenas);
  }, [info.minimoDezenas]);

  useEffect(() => {
    if (!own) return;
    try {
      const savedSkip = localStorage.getItem(
        `bolao_skip_palpite_${bolao.id}_${own.id}`,
      );
      setDispensouPalpite(savedSkip === "1");
    } catch {
      setDispensouPalpite(false);
    }
  }, [bolao.id, own]);

  const valorTotalParticipante = own ? own.qtd_cotas * bolao.valor_cota : 0;
  const valorJaPago = cotasJaPagas * bolao.valor_cota;
  const valorAPagarAgora = cotasRestantes * bolao.valor_cota;

  useEffect(() => {
    let active = true;
    if (
      !own ||
      !bolao.chave_pix_organizador ||
      cotasRestantes <= 0 ||
      !hasAccepted
    ) {
      setPixPayload("");
      setPixSvg("");
      return;
    }
    try {
      const brCode = gerarPayloadPixEstatico({
        chavePix: bolao.chave_pix_organizador,
        tipoChave: bolao.tipo_chave_pix,
        nomeRecebedor: bolao.nome_organizador || "ORGANIZADOR BOLAO",
        cidadeRecebedor: bolao.cidade_loterica || "BRASILIA",
        valor: valorAPagarAgora,
        txid: `BOLAO${bolao.concurso_numero}`,
      });
      setPixPayload(brCode);
      gerarQrCodePixSvg(brCode)
        .then((svg) => {
          if (active) setPixSvg(svg);
        })
        .catch(() => {
          if (active) setPixSvg("");
        });
    } catch {
      setPixPayload("");
      setPixSvg("");
    }
    return () => {
      active = false;
    };
  }, [
    own,
    bolao.chave_pix_organizador,
    bolao.tipo_chave_pix,
    bolao.nome_organizador,
    bolao.cidade_loterica,
    bolao.concurso_numero,
    valorAPagarAgora,
    cotasRestantes,
    hasAccepted,
  ]);

  const officialUrl =
    LOTTERY_SOURCES[info.modalidadeBase as keyof typeof LOTTERY_SOURCES] ||
    "https://loterias.caixa.gov.br/";

  const togglePalpiteNumber = (num: number) => {
    if (palpiteNums.includes(num)) {
      setPalpiteNums(palpiteNums.filter((n) => n !== num));
    } else if (palpiteNums.length < info.maximoDezenas) {
      setPalpiteNums([...palpiteNums, num].sort((a, b) => a - b));
    }
  };

  const gerarPalpiteSurpresinha = (qtd = qtdSurpresinha) => {
    const alvo = Math.max(1, Math.min(info.maximoDezenas, qtd));
    const s = new Set<number>();
    while (s.size < alvo) {
      s.add(Math.floor(Math.random() * info.universoNumeros) + 1);
    }
    setPalpiteNums(Array.from(s).sort((a, b) => a - b));
  };

  const jogosPrincipais = jogos.filter((j) => j.tipo_jogo !== "troco");
  const jogosTroco = jogos.filter((j) => j.tipo_jogo === "troco");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="bg-slate-900 text-white">
        <div className="page py-7 flex flex-wrap justify-between gap-4 items-center">
          <div className="flex gap-4 items-center min-w-0">
            <BrandLogo size={40} />
            <div className="min-w-0">
              <p className="text-emerald-300 text-sm">
                {own
                  ? `Painel individual · ${own.nome}`
                  : "Convite e informações do bolão"}
              </p>
              <h1 className="text-2xl font-bold break-words">{bolao.nome}</h1>
            </div>
          </div>
          <button
            type="button"
            className="btn border-slate-700 text-white hover:bg-slate-800 text-xs"
            onClick={onReload}
          >
            Atualizar
          </button>
        </div>
      </header>

      <main className="page py-6 space-y-5">
        {/* Barra visual das 3 etapas */}
        <nav
          aria-label="Etapas de participação"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          {[
            { n: 1, label: "1. Ver e aceitar regras" },
            { n: 2, label: "2. Pagamento PIX" },
            { n: 3, label: "3. Jogos e transparência" },
          ].map((step) => {
            const done = currentStep > step.n || (step.n === 3 && isPaid);
            const active = currentStep === step.n && !(step.n === 3 && isPaid);
            return (
              <div
                key={step.n}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  done
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : active
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-400"
                }`}
              >
                {done ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : null}
                <span>{step.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Cartão de Informações Gerais do Bolão (sempre visível) */}
        <section className="card space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-lg">
              {info.icone} {bolao.modalidade} · Concurso #{bolao.concurso_numero}
            </p>
            <span className="text-sm font-mono font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full">
              Cota: {currency(bolao.valor_cota)}
            </span>
          </div>

          <p className="text-sm">
            Prazo limite de pagamento:{" "}
            <strong>{new Date(bolao.data_limite).toLocaleString("pt-BR")}</strong>
          </p>

          {(bolao.data_sorteio ||
            lotteryInfo?.proximoConcurso.numero === bolao.concurso_numero) && (
            <p className="text-sm text-emerald-800 font-medium flex items-center gap-1.5">
              <Calendar size={15} />
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

          <p className="text-sm">
            Resumo atual: <strong>{resumo?.participantes || 0}</strong> participante(s) ·{" "}
            <strong>{resumo?.cotas_pagas || 0}</strong> de{" "}
            <strong>{resumo?.cotas || 0}</strong> cota(s) confirmada(s) ·{" "}
            <strong>{resumo?.jogos ?? jogos.length}</strong> jogo(s) registrado(s)
            {(resumo?.jogos_troco || 0) > 0 && (
              <> (incluindo {resumo?.jogos_troco} jogo(s) de troco)</>
            )}
          </p>

          {lotteryInfo && !bolao.resultado && (
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1 mt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-emerald-900 uppercase tracking-wide">
                  Portal Loterias Caixa · Atualizado
                </strong>
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-emerald-800 inline-flex items-center gap-1"
                >
                  <span>Ver na Caixa</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <p className="text-slate-700">
                Próximo concurso oficial:{" "}
                <strong>
                  #{lotteryInfo.proximoConcurso.numero} (
                  {lotteryInfo.proximoConcurso.dataProximoConcurso})
                </strong>
                {lotteryInfo.proximoConcurso.valorEstimado > 0 && (
                  <>
                    {" "}
                    · Estimativa:{" "}
                    <strong>{currency(lotteryInfo.proximoConcurso.valorEstimado)}</strong>
                  </>
                )}
                {lotteryInfo.ultimoConcurso.acumulado && " · Acumulado!"}
              </p>
            </div>
          )}
        </section>

        {actionFeedback && (
          <p
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold"
          >
            {actionFeedback}
          </p>
        )}

        {/* Regras do Grupo (visíveis desde a Etapa 1) */}
        <section className="card space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-700" />
            <span>Regras deste bolão</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            {bolao.regras?.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 pt-1">
            Esta plataforma organiza a conferência do grupo e não intermedia valores.
            Os pagamentos são feitos diretamente via PIX ao organizador
            {bolao.nome_organizador ? ` (${bolao.nome_organizador})` : ""}.
          </p>
        </section>

        {/* CASO 1: Link Público Geral (#b-slug, sem token individual) */}
        {!own && (
          <section className="card space-y-4 border-emerald-300">
            <h2 className="text-xl font-bold">Participar deste bolão</h2>
            <p className="text-sm text-slate-700">
              Se o organizador já cadastrou você, abra o <strong>link individual</strong>{" "}
              que ele enviou no seu WhatsApp. Caso esteja entrando agora pelo grupo,
              preencha seus dados e aceite as regras para gerar seu QR Code PIX:
            </p>

            {frozen || bolao.permitir_inscricao_publica === false ? (
              <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
                Novas inscrições pelo link geral estão encerradas. Solicite seu link
                individual diretamente ao organizador.
              </p>
            ) : (
              onParticipantAction && (
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setActionFeedback("");
                    const ok = await onParticipantAction("inscrever_publico", {
                      nome: inscNome,
                      telefone: inscTelefone,
                      qtd_cotas: inscCotas,
                      aceitouRegras: checkedRules,
                    });
                    if (ok) {
                      setActionFeedback(
                        "Inscrição e aceite registrados! Redirecionando para o pagamento PIX…",
                      );
                    }
                  }}
                >
                  <div className="grid sm:grid-cols-3 gap-3">
                    <label className="text-sm font-medium">
                      Seu nome completo
                      <input
                        required
                        maxLength={120}
                        value={inscNome}
                        onChange={(e) => setInscNome(e.target.value)}
                        placeholder="Ex.: Lucas Oliveira"
                        className="block w-full border border-slate-300 rounded-lg p-2.5 mt-1"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Seu WhatsApp com DDD
                      <input
                        required
                        type="tel"
                        maxLength={30}
                        value={inscTelefone}
                        onChange={(e) => setInscTelefone(e.target.value)}
                        placeholder="(11) 98888-7777"
                        className="block w-full border border-slate-300 rounded-lg p-2.5 mt-1"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Quantidade de cotas
                      <input
                        required
                        type="number"
                        min="1"
                        max="100"
                        value={inscCotas}
                        onChange={(e) =>
                          setInscCotas(
                            Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                          )
                        }
                        className="block w-full border border-slate-300 rounded-lg p-2.5 mt-1"
                      />
                    </label>
                  </div>

                  <p className="text-sm font-semibold">
                    Valor total da sua participação:{" "}
                    <span className="text-emerald-700">
                      {currency(inscCotas * bolao.valor_cota)}
                    </span>
                  </p>

                  <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={checkedRules}
                      onChange={(e) => setCheckedRules(e.target.checked)}
                      className="mt-1 w-4 h-4 shrink-0"
                    />
                    <span>
                      Li e aceito as regras deste bolão descritas acima.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={busy || !checkedRules}
                    className="btn primary"
                  >
                    {busy ? "Registrando…" : "Aceitar bolão e abrir QR Code PIX"}
                  </button>
                </form>
              )
            )}
          </section>
        )}

        {/* CASO 2: Link Individual — ETAPA 1 (Aceite pendente) */}
        {own && !hasAccepted && !isPaid && (
          <section className="card space-y-4 border-2 border-emerald-500">
            <h2 className="text-xl font-bold">
              Etapa 1: Olá, {own.nome}! Confirme seu aceite para participar
            </h2>
            <p className="text-sm">
              Você está cadastrado(a) com <strong>{own.qtd_cotas} cota(s)</strong>{" "}
              (total de <strong>{currency(valorTotalParticipante)}</strong>). Para
              liberar a chave e o QR Code PIX de pagamento, confirme abaixo que está
              de acordo com as regras do bolão:
            </p>

            <label className="flex items-start gap-3 text-sm cursor-pointer p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                checked={checkedRules}
                onChange={(e) => setCheckedRules(e.target.checked)}
                className="mt-1 w-4 h-4 shrink-0"
              />
              <span>
                Li e aceito todas as regras do <strong>{bolao.nome}</strong>, ciente
                de que os jogos e comprovantes completos são liberados após a
                confirmação do pagamento pelo organizador.
              </span>
            </label>

            <button
              type="button"
              disabled={busy || !checkedRules || !onParticipantAction}
              onClick={async () => {
                if (!onParticipantAction) return;
                const ok = await onParticipantAction("aceitar_regras");
                if (ok) {
                  setActionFeedback(
                    "Aceite registrado! Realize o PIX abaixo para concluir sua participação.",
                  );
                }
              }}
              className="btn primary"
            >
              {busy ? "Confirmando…" : "Aceitar e liberar pagamento PIX"}
            </button>
          </section>
        )}

        {/* CASO 3: Link Individual — ETAPA 2 (Aceito, aguardando pagamento total ou da diferença de cotas novas) */}
        {own && hasAccepted && cotasRestantes > 0 && (
          <section className="card space-y-4 border-2 border-emerald-600">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <QrCode size={22} className="text-emerald-700" />
                <span>
                  {cotasJaPagas > 0
                    ? `Pagamento complementar (+${cotasRestantes} ${cotasRestantes === 1 ? "cota nova" : "cotas novas"})`
                    : "Etapa 2: Pagamento via PIX"}
                </span>
              </h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900">
                {own.avisou_pagamento_em
                  ? "PIX informado · Aguardando confirmação do organizador"
                  : cotasJaPagas > 0
                    ? "Aguardando apenas a diferença"
                    : "Aguardando pagamento"}
              </span>
            </div>

            {cotasJaPagas > 0 ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm space-y-1">
                <p>
                  Participante: <strong>{own.nome}</strong> · Total reservado:{" "}
                  <strong>{own.qtd_cotas} cotas</strong> (
                  {currency(valorTotalParticipante)})
                </p>
                <p className="text-emerald-800">
                  ✅ Já pago e confirmado:{" "}
                  <strong>
                    {cotasJaPagas} {cotasJaPagas === 1 ? "cota" : "cotas"} (
                    {currency(valorJaPago)})
                  </strong>
                </p>
                <p className="text-base font-bold text-slate-900 pt-0.5">
                  Valor a pagar agora (somente a diferença de +{cotasRestantes}{" "}
                  {cotasRestantes === 1 ? "cota" : "cotas"}):{" "}
                  <span className="text-emerald-700">
                    {currency(valorAPagarAgora)}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm">
                Participante: <strong>{own.nome}</strong> ·{" "}
                <strong>{own.qtd_cotas} cota(s)</strong> · Valor exato:{" "}
                <strong className="text-emerald-700 text-base">
                  {currency(valorAPagarAgora)}
                </strong>
              </p>
            )}

            {bolao.chave_pix_organizador ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 rounded-2xl bg-slate-50 border border-slate-200">
                {pixSvg && (
                  <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-slate-200">
                    <div
                      aria-label="QR Code PIX para pagamento das cotas"
                      dangerouslySetInnerHTML={{ __html: pixSvg }}
                    />
                    <span className="text-xs text-slate-500 mt-2 text-center">
                      Escaneie no aplicativo do seu banco (valor já preenchido:{" "}
                      {currency(valorAPagarAgora)})
                    </span>
                  </div>
                )}

                <div className="space-y-3 min-w-0">
                  {pixPayload && (
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-500 block mb-1">
                        PIX Copia e Cola (com valor exato):
                      </span>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono break-all max-h-24 overflow-y-auto">
                        {pixPayload}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(pixPayload);
                          setCopiedPixCode(true);
                          setTimeout(() => setCopiedPixCode(false), 2200);
                        }}
                        className="btn primary w-full mt-2 text-xs"
                      >
                        {copiedPixCode ? <Check size={15} /> : <Copy size={15} />}
                        <span>
                          {copiedPixCode
                            ? "Código PIX copiado!"
                            : "Copiar código PIX Copia e Cola"}
                        </span>
                      </button>
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-bold uppercase text-slate-500 block mb-1">
                      Ou copie apenas a chave PIX do organizador:
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 rounded-lg bg-white border border-slate-200 text-xs break-all">
                        {bolao.chave_pix_organizador}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(bolao.chave_pix_organizador);
                          setCopiedPixKey(true);
                          setTimeout(() => setCopiedPixKey(false), 2200);
                        }}
                        className="btn text-xs shrink-0"
                      >
                        {copiedPixKey ? "Copiada!" : "Copiar chave"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-amber-800">
                O organizador ainda não cadastrou a chave PIX. Solicite no grupo.
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
              {own.avisou_pagamento_em ? (
                <p className="text-sm text-emerald-800 font-medium">
                  ✅ Você informou o pagamento em{" "}
                  {new Date(own.avisou_pagamento_em).toLocaleString("pt-BR")}. Assim
                  que o organizador confirmar, os jogos e comprovantes aparecerão
                  automaticamente aqui!
                </p>
              ) : (
                <button
                  type="button"
                  disabled={busy || !onParticipantAction}
                  onClick={async () => {
                    if (!onParticipantAction) return;
                    const ok = await onParticipantAction("informar_pagamento");
                    if (ok) {
                      setActionFeedback(
                        "O organizador foi avisado do seu PIX! Aguarde a confirmação para liberar todos os jogos.",
                      );
                    }
                  }}
                  className="btn bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                >
                  {busy ? "Avisando…" : "Já fiz o PIX — Avisar organizador"}
                </button>
              )}
            </div>
          </section>
        )}

        {/* SEÇÃO DE PALPITES DOS PARTICIPANTES (100% Opcional, recolhida por padrão e com dezenas livres) */}
        {own && (hasAccepted || isPaid) && (
          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Lightbulb size={18} className="text-indigo-600" />
                <h2 className="text-base sm:text-lg font-bold">
                  Sugestão de palpites para o bolão
                </h2>
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Opcional
                </span>
              </div>
              {meusPalpites.length > 0 && (
                <span className="text-xs text-indigo-700 font-semibold">
                  Enviados por você: {meusPalpites.length} / 3
                </span>
              )}
            </div>

            {/* Estado recolhido: deixa claro que ninguém é obrigado a palpitar */}
            {!palpiteAberto && !frozen && meusPalpites.length < 3 && onParticipantAction && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <p className="text-slate-600">
                  {dispensouPalpite && meusPalpites.length === 0
                    ? "Você optou por não enviar palpite — tudo certo, sua participação segue normalmente sem precisar escolher dezenas."
                    : "Não é obrigatório dar palpite! Se preferir deixar os jogos por conta do organizador, não precisa marcar nada."}
                </p>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDispensouPalpite(false);
                      try {
                        localStorage.removeItem(
                          `bolao_skip_palpite_${bolao.id}_${own.id}`,
                        );
                      } catch {}
                      setPalpiteAberto(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                  >
                    {meusPalpites.length > 0
                      ? "Enviar outro palpite"
                      : "Quero sugerir dezenas"}
                  </button>
                  {!dispensouPalpite && meusPalpites.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDispensouPalpite(true);
                        setPalpiteAberto(false);
                        setPalpiteNums([]);
                        try {
                          localStorage.setItem(
                            `bolao_skip_palpite_${bolao.id}_${own.id}`,
                            "1",
                          );
                        } catch {}
                      }}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                    >
                      Prefiro não dar palpite
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Volante de palpite aberto apenas para quem clicou em participar dos palpites */}
            {palpiteAberto && !frozen && meusPalpites.length < 3 && onParticipantAction && (
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-indigo-200">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Escolha quantas dezenas quiser (de 1 até {info.maximoDezenas} números):
                    </span>
                    <span className="text-slate-600">
                      Selecionadas agora: <strong>{palpiteNums.length}</strong> de{" "}
                      {info.maximoDezenas} — você pode sugerir seus números favoritos, um
                      jogo simples ({info.minimoDezenas}) ou jogos maiores (7, 8, 9, 10+
                      dezenas).
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                      <span className="text-slate-600">Qtd:</span>
                      <select
                        aria-label="Quantidade de dezenas na Surpresinha"
                        value={qtdSurpresinha}
                        onChange={(e) => {
                          const q = Number(e.target.value);
                          setQtdSurpresinha(q);
                        }}
                        className="font-bold text-slate-800 bg-transparent"
                      >
                        {Array.from(
                          { length: info.maximoDezenas },
                          (_, idx) => idx + 1,
                        ).map((q) => (
                          <option key={q} value={q}>
                            {q} {q === 1 ? "dezena" : "dezenas"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => gerarPalpiteSurpresinha(qtdSurpresinha)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} className="text-amber-500" />
                      Surpresinha ({qtdSurpresinha})
                    </button>
                    {palpiteNums.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPalpiteNums([])}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`grid gap-1.5 ${
                    info.universoNumeros <= 25
                      ? "grid-cols-5"
                      : info.universoNumeros <= 60
                        ? "grid-cols-6 sm:grid-cols-10"
                        : "grid-cols-8 sm:grid-cols-10"
                  }`}
                >
                  {Array.from({ length: info.universoNumeros }, (_, i) => i + 1).map(
                    (num) => {
                      const sel = palpiteNums.includes(num);
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => togglePalpiteNumber(num)}
                          className={`h-9 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                            sel
                              ? "bg-indigo-600 text-white"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50"
                          }`}
                        >
                          {String(num).padStart(2, "0")}
                        </button>
                      );
                    },
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      busy ||
                      palpiteNums.length < 1 ||
                      palpiteNums.length > info.maximoDezenas
                    }
                    onClick={async () => {
                      const ok = await onParticipantAction("enviar_palpite", {
                        dezenas: palpiteNums,
                      });
                      if (ok) {
                        setPalpiteNums([]);
                        setPalpiteAberto(false);
                        setActionFeedback(
                          "Palpite enviado! O organizador já consegue visualizar sua sugestão.",
                        );
                      }
                    }}
                    className="btn primary text-xs"
                  >
                    Enviar meu palpite ({palpiteNums.length}{" "}
                    {palpiteNums.length === 1 ? "dezena" : "dezenas"})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPalpiteNums([]);
                      setPalpiteAberto(false);
                    }}
                    className="btn text-xs"
                  >
                    Fechar sem enviar
                  </button>
                </div>
              </div>
            )}

            {palpitesLista.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  Palpites registrados pela turma ({palpitesLista.length}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {palpitesLista.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <strong className="block text-slate-800">
                          {p.participante_nome}{" "}
                          <span className="font-normal text-slate-500">
                            ({p.dezenas.length}{" "}
                            {p.dezenas.length === 1 ? "dezena" : "dezenas"})
                          </span>
                        </strong>
                        <span className="font-mono text-indigo-700 font-bold">
                          {p.dezenas
                            .map((n) => String(n).padStart(2, "0"))
                            .join(" - ")}
                        </span>
                      </div>
                      {!frozen && p.is_meu && onParticipantAction && (
                        <button
                          type="button"
                          aria-label="Remover meu palpite"
                          onClick={() =>
                            void onParticipantAction("remover_palpite", {
                              palpiteId: p.id,
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ETAPA 3: TRANSPARÊNCIA COMPLETA (Liberada SOMENTE após pagamento confirmado!) */}
        {transparenciaLiberada && own ? (
          <>
            <section className="card border-emerald-300 bg-emerald-50/40 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-emerald-950">
                  ✅ Participação confirmada — {own.nome}
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-600 text-white">
                  {cotasRestantes > 0
                    ? `${cotasJaPagas}/${own.qtd_cotas} cota(s) paga(s)`
                    : `Pago · ${own.qtd_cotas} cota(s)`}
                </span>
              </div>
              <p className="text-sm">
                Valor quitado: <strong>{currency(valorJaPago)}</strong>
                {cotasRestantes > 0 && (
                  <>
                    {" "}
                    · Pendente de confirmação:{" "}
                    <strong className="text-amber-800">
                      +{cotasRestantes} cota(s) ({currency(valorAPagarAgora)})
                    </strong>
                  </>
                )}
                {own.pago_em && (
                  <>
                    {" "}
                    · Confirmado em{" "}
                    {new Date(own.pago_em).toLocaleString("pt-BR")}
                  </>
                )}
              </p>

              {/* Status da Entrega da Cota (visível no link individual do cotista) */}
              {isFullyPaid && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-wrap items-center justify-between gap-2 ${
                    own.cota_entregue
                      ? "bg-indigo-50 border-indigo-300 text-indigo-950"
                      : "bg-white border-emerald-200 text-slate-700"
                  }`}
                >
                  <span>
                    {own.cota_entregue
                      ? "🎟️ Cota entregue pelo organizador!"
                      : "🎟️ Pagamento quitado · Aguardando entrega/retirada da cota"}
                  </span>
                  {own.cota_entregue && own.cota_entregue_em && (
                    <span className="text-[11px] font-normal text-indigo-800">
                      Registrado em{" "}
                      {new Date(own.cota_entregue_em).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              )}

              {(bolao.resultado || (bolao.resultados_extras?.length || 0) > 0) && (
                <div className="pt-2 border-t border-emerald-200 space-y-1">
                  <p className="text-lg font-bold text-emerald-900">
                    Seu rateio total: {currency(data.rateioPessoal || 0)}
                  </p>
                  {(data.rateioPessoalTroco || 0) > 0 && (
                    <p className="text-xs text-slate-700">
                      Sendo {currency(data.rateioPessoalCotas || 0)} proporcional às
                      suas cotas + {currency(data.rateioPessoalTroco || 0)} da
                      divisão igualitária do troco.
                    </p>
                  )}
                </div>
              )}
            </section>

            <ResultadoView bolao={bolao} jogos={jogos} />

            {/* Jogos Principais */}
            <section className="card space-y-4">
              <h2 className="text-xl font-bold">
                Jogos principais do bolão ({jogosPrincipais.length})
              </h2>
              {jogosPrincipais.length === 0 ? (
                <p className="text-sm text-slate-600">
                  O organizador ainda está registrando as apostas na lotérica.
                </p>
              ) : (
                jogosPrincipais.map((j, i) => (
                  <div
                    key={j.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-xs">
                      <h3 className="font-bold text-sm">Jogo Principal #{i + 1}</h3>
                      {j.codigo_bilhete && (
                        <span className="font-mono text-slate-500">
                          Controle: {j.codigo_bilhete}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {j.dezenas.map((n) => (
                        <span className="number-ball" key={n}>
                          {String(n).padStart(2, "0")}
                        </span>
                      ))}
                    </div>
                    {j.foto_sha256 && (
                      <p className="text-[11px] font-mono text-slate-500 break-all">
                        Comprovante arquivado (SHA-256): {j.foto_sha256}
                      </p>
                    )}
                  </div>
                ))
              )}
            </section>

            {/* Jogos de Troco (Divisão Igualitária) */}
            {jogosTroco.length > 0 && (
              <section className="card border-amber-300 bg-amber-50/30 space-y-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-amber-950">
                    <Coins size={20} className="text-amber-600" />
                    <span>Jogos de Troco — Sem Cotas ({jogosTroco.length})</span>
                  </h2>
                  <p className="text-xs text-amber-900 mt-1">
                    Apostas feitas com o troco do caixa do grupo. Qualquer prêmio
                    destes jogos é dividido em partes iguais entre todos os
                    participantes confirmados.
                  </p>
                </div>
                {jogosTroco.map((j, i) => (
                  <div
                    key={j.id}
                    className="p-3 rounded-xl border border-amber-200 bg-white space-y-2"
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-xs">
                      <h3 className="font-bold text-sm text-amber-950">
                        Jogo de Troco #{i + 1}
                        {j.modalidade_especifica || j.concurso_especifico
                          ? ` (${j.modalidade_especifica || bolao.modalidade} · Concurso #${j.concurso_especifico || bolao.concurso_numero})`
                          : ""}
                      </h3>
                      {j.observacao && (
                        <span className="italic text-slate-600">{j.observacao}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {j.dezenas.map((n) => (
                        <span
                          key={n}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-bold text-sm"
                        >
                          {String(n).padStart(2, "0")}
                        </span>
                      ))}
                    </div>
                    {j.foto_sha256 && (
                      <p className="text-[11px] font-mono text-slate-500 break-all">
                        Comprovante arquivado (SHA-256): {j.foto_sha256}
                      </p>
                    )}
                  </div>
                ))}
              </section>
            )}
          </>
        ) : (
          <section className="card bg-slate-100 border-slate-300 flex items-start gap-3 text-sm text-slate-700">
            <Lock size={20} className="text-slate-500 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900">
                Etapa 3: Jogos, comprovantes e conferência bloqueados até a confirmação do pagamento
              </strong>
              <p className="mt-1">
                Para segurança de todos os cotistas, as dezenas registradas (
                {resumo?.jogos || 0} jogo(s)), os hashes de auditoria dos
                comprovantes e o demonstrativo de rateio são liberados
                automaticamente no seu link individual assim que o organizador
                confirmar o recebimento do seu PIX.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
