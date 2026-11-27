import React, { useState } from "react";
import { AlertTriangle, Bell, Calendar, ExternalLink, RefreshCw } from "lucide-react";
import type { Bolao, Jogo, Participante, PoolState, TipoJogoBolao } from "./types";
import { usePool } from "./hooks/usePool";
import { useLotteryInfo } from "./hooks/useLotteryInfo";
import { BrandLogo } from "./components/BrandLogo";
import { FinancialSummary } from "./components/FinancialSummary";
import { ShareBar } from "./components/ShareBar";
import { ParticipantList } from "./components/ParticipantList";
import { GamesList } from "./components/GamesList";
import { PainelConferencia, currency } from "./components/PainelConferencia";
import { PublicTransparencyView } from "./components/PublicTransparencyView";
import { VolanteModal } from "./components/VolanteModal";
import { AddParticipantModal } from "./components/AddParticipantModal";
import { PrintReportModal } from "./components/PrintReportModal";
import {
  ConfigurarBolaoModal,
  type OrganizadorParticipacaoConfig,
} from "./components/ConfigurarBolaoModal";
import { PlanejadorModal } from "./components/PlanejadorModal";
import { LegalFaqModal } from "./components/LegalFaqModal";
import { AvisosN8nModal } from "./components/AvisosN8nModal";
import { getModalidadeInfo, LOTTERY_SOURCES } from "./constants/lotteryCatalog";

const blank: Bolao = {
  id: "novo",
  nome: "Meu bolão",
  modalidade: "Mega-Sena",
  concurso_numero: 3091,
  valor_cota: 12,
  data_limite: new Date(Date.now() + 86400000 * 2).toISOString(),
  data_sorteio: new Date(Date.now() + 86400000 * 2 + 10800000).toISOString(),
  chave_pix_organizador: "",
  status: "aberto",
  hash_slug: "novo",
  regras: [
    "Somente pagamentos confirmados antes do fechamento participam do rateio.",
    "O prêmio é dividido proporcionalmente às cotas pagas; centavos restantes seguem a regra de maiores frações.",
    "O organizador guarda os recibos originais e presta contas aos participantes.",
  ],
};

function syncOrganizerParticipant(
  bolaoId: string,
  nomeOrganizador: string | undefined,
  currentList: Participante[],
  orgConfig?: OrganizadorParticipacaoConfig,
): Participante[] {
  if (!orgConfig) return currentList;
  const existingOrg = currentList.find((p) => p.is_organizador);

  if (!orgConfig.participa) {
    return existingOrg
      ? currentList.filter((p) => p.id !== existingOrg.id)
      : currentList;
  }

  const nomeFinal = (nomeOrganizador || "Organizador").trim();
  if (existingOrg) {
    return currentList.map((p) =>
      p.id === existingOrg.id
        ? {
            ...p,
            nome: nomeFinal,
            telefone: orgConfig.telefone || p.telefone,
            qtd_cotas: orgConfig.cotas,
            status_pagamento: orgConfig.pago ? "Pago" : "Pendente",
            is_organizador: true,
          }
        : p,
    );
  }

  return [
    {
      id: bolaoId === "novo" ? "org-init" : crypto.randomUUID(),
      bolao_id: bolaoId,
      nome: nomeFinal,
      telefone: orgConfig.telefone,
      qtd_cotas: orgConfig.cotas,
      status_pagamento: orgConfig.pago ? "Pago" : "Pendente",
      data_registro: new Date().toISOString(),
      is_organizador: true,
    },
    ...currentList,
  ];
}

export default function App() {
  const pool = usePool();
  const [tab, setTab] = useState<"participantes" | "jogos" | "conferencia">(
    "participantes",
  );
  const [modal, setModal] = useState<string | null>(null);
  const [editingParticipant, setEditingParticipant] =
    useState<Participante | null>(null);
  const [selectedNextDraw, setSelectedNextDraw] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [prefill, setPrefill] = useState<number[]>([]);
  const [volanteTipoJogo, setVolanteTipoJogo] = useState<TipoJogoBolao>("normal");

  const state = pool.data;
  const currentModality = state?.bolao.modalidade || "Mega-Sena";
  const { lotteryInfo, loadingLottery, refreshLottery } = useLotteryInfo(
    currentModality,
    Boolean(state && pool.isAdmin),
  );

  async function save(next: PoolState, action = "atualizado") {
    setNotice("");
    const ok = await pool.save(next, action);
    if (ok) setNotice("Alteração salva no servidor.");
    return ok;
  }

  if (pool.loading && !state)
    return (
      <main className="page py-12" role="status">
        Carregando bolão…
      </main>
    );

  if (!state)
    return (
      <main className="page py-12 space-y-6">
        <BrandLogo size={56} />
        <h1 className="text-3xl font-bold">Seu bolão, com as contas em dia.</h1>
        <p>
          Cadastre participantes, puxe concursos e datas oficiais da Caixa,
          registre bilhetes e compartilhe a conferência do grupo.
        </p>
        {pool.error && (
          <p role="alert" className="error">
            {pool.error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button className="btn primary" onClick={() => setModal("config")}>
            Criar bolão
          </button>
          {pool.error && (
            <button className="btn" onClick={() => void pool.reload()}>
              Tentar novamente
            </button>
          )}
        </div>
        <p className="text-sm">
          Já participa de um bolão? Abra o link enviado pelo organizador. O link
          de administração permite editar e deve ser guardado em local privado.
        </p>
        {localStorage.getItem("bolao_da_virada_info") && (
          <div className="card">
            <p>
              Há dados da versão anterior neste aparelho. Eles foram
              preservados, mas ainda não constituem um bolão compartilhado.
            </p>
            <button
              className="btn mt-3"
              onClick={() => {
                const keys = ["info", "participantes", "jogos", "sorteadas"];
                const blob = new Blob(
                  [
                    JSON.stringify(
                      Object.fromEntries(
                        keys.map((k) => [
                          k,
                          JSON.parse(
                            localStorage.getItem("bolao_da_virada_" + k) ||
                              "null",
                          ),
                        ]),
                      ),
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                );
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "backup-bolao-local.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
              }}
            >
              Baixar cópia dos dados anteriores
            </button>
          </div>
        )}
        {modal === "config" && (
          <ConfigurarBolaoModal
            isOpen
            onClose={() => setModal(null)}
            bolaoAtual={blank}
            busy={pool.busy}
            onSalvarBolao={async (b, orgConfig) => {
              const initialParticipants = syncOrganizerParticipant(
                b.id,
                b.nome_organizador,
                [],
                orgConfig,
              );
              const ok = await pool.save(
                { bolao: b, participantes: initialParticipants, jogos: [] },
                "criado",
                true,
              );
              if (ok) setModal(null);
              return ok;
            }}
          />
        )}
      </main>
    );

  if (!pool.isAdmin)
    return (
      <>
        <PublicTransparencyView
          data={state}
          busy={pool.busy}
          onReload={() => void pool.reload()}
          onParticipantAction={pool.participantAction}
        />
        {pool.error && (
          <div className="page mt-4">
            <p role="alert" className="error">
              {pool.error}
            </p>
          </div>
        )}
      </>
    );

  const { bolao, participantes, jogos } = state;
  const palpites = state.palpites || [];
  const eventos = state.eventos || [];
  const avisosNaoLidos = eventos.filter((e) => !e.lido).length;
  const adminBolao = { ...bolao, admin_token: pool.adminToken };
  const deadlinePassed = Date.now() >= Date.parse(bolao.data_limite);
  // O organizador só fica impedido de cadastrar jogos / confirmar os últimos PIX
  // quando lacrar manualmente ("fechado_em") ou depois que o resultado for apurado.
  const frozen = Boolean(bolao.fechado_em || bolao.resultado);
  const info = getModalidadeInfo(bolao.modalidade);
  const participanteOrganizador =
    participantes.find((p) => p.is_organizador) || null;

  // Verifica se o concurso já passou / venceu sem ter sido apurado
  const drawPassedByDate = Boolean(
    bolao.data_sorteio && Date.now() > Date.parse(bolao.data_sorteio),
  );
  const drawAlreadyHeldOnCaixa = Boolean(
    lotteryInfo && lotteryInfo.ultimoConcurso.numero >= bolao.concurso_numero,
  );
  const isContestOverdue =
    !bolao.resultado && (drawPassedByDate || drawAlreadyHeldOnCaixa);

  const availableFutureDraws = (lotteryInfo?.opcoesConcursos || []).filter(
    (o) => o.numero > bolao.concurso_numero,
  );
  const targetMigrationDraw =
    availableFutureDraws.find((o) => o.numero === selectedNextDraw) ||
    availableFutureDraws[0];

  const participantActionTag = deadlinePassed
    ? "confirmacao_pos_prazo"
    : "atualizado";
  const gameActionTag = deadlinePassed ? "jogo_pos_prazo" : "atualizado";

  const addParticipant = async (p: Omit<Participante, "id">) => {
    const ok = await save(
      {
        ...state,
        participantes: [...participantes, { ...p, id: crypto.randomUUID() }],
      },
      participantActionTag,
    );
    if (ok) setModal(null);
    return ok;
  };

  const addParticipantsBatch = async (lista: Omit<Participante, "id">[]) => {
    const novos = lista.map((p) => ({ ...p, id: crypto.randomUUID() }));
    const ok = await save(
      {
        ...state,
        participantes: [...participantes, ...novos],
      },
      participantActionTag,
    );
    if (ok) setModal(null);
    return ok;
  };

  const editParticipant = async (updated: Participante) => {
    const ok = await save(
      {
        ...state,
        participantes: participantes.map((p) =>
          p.id === updated.id ? updated : p,
        ),
      },
      deadlinePassed ? "confirmacao_pos_prazo" : "participante_editado",
    );
    if (ok) {
      setEditingParticipant(null);
      setModal(null);
    }
    return ok;
  };

  const addGame = async (j: Omit<Jogo, "id" | "criado_em">) => {
    if (j.foto_url?.startsWith("data:")) {
      const url = await pool.uploadReceipt(j.foto_url);
      if (!url) return false;
      j = { ...j, foto_url: url };
    }
    if (
      await save(
        {
          ...state,
          jogos: [
            ...jogos,
            {
              ...j,
              id: crypto.randomUUID(),
              criado_em: new Date().toISOString(),
            },
          ],
        },
        gameActionTag,
      )
    ) {
      setModal(null);
      setTab("jogos");
      return true;
    }
    return false;
  };

  const addGamesBatch = async (lista: Omit<Jogo, "id" | "criado_em">[]) => {
    if (!lista.length) return false;
    let sharedReceiptUrl = lista[0].foto_url;
    if (sharedReceiptUrl?.startsWith("data:")) {
      const uploaded = await pool.uploadReceipt(sharedReceiptUrl);
      if (!uploaded) return false;
      sharedReceiptUrl = uploaded;
    }
    const now = new Date().toISOString();
    const novos: Jogo[] = lista.map((item) => ({
      ...item,
      foto_url: item.foto_url?.startsWith("data:")
        ? sharedReceiptUrl
        : item.foto_url,
      id: crypto.randomUUID(),
      criado_em: now,
    }));
    if (
      await save(
        {
          ...state,
          jogos: [...jogos, ...novos],
        },
        gameActionTag,
      )
    ) {
      setModal(null);
      setTab("jogos");
      return true;
    }
    return false;
  };

  const handleMigrateOverdueContest = async () => {
    if (!targetMigrationDraw) return;
    const confirmMsg = `Mudar este bolão do concurso #${bolao.concurso_numero} para o concurso #${targetMigrationDraw.numero} (sorteio previsto em ${targetMigrationDraw.dataSorteioBr})?\n\nAs participações e jogos serão mantidos e o prazo será reaberto até ${new Date(targetMigrationDraw.prazoSugeridoIso).toLocaleString("pt-BR")}.`;
    if (!confirm(confirmMsg)) return;

    await save(
      {
        ...state,
        bolao: {
          ...bolao,
          modalidade: targetMigrationDraw.modalidadeSugerida || bolao.modalidade,
          concurso_numero: targetMigrationDraw.numero,
          data_sorteio: targetMigrationDraw.dataSorteioIso,
          data_limite: targetMigrationDraw.prazoSugeridoIso,
          status: "aberto",
        },
      },
      "adiar_concurso",
    );
  };

  const publicUrl = "/#b-" + bolao.hash_slug;
  const officialPortalUrl =
    LOTTERY_SOURCES[info.modalidadeBase as keyof typeof LOTTERY_SOURCES] ||
    "https://loterias.caixa.gov.br/";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="bg-slate-900 text-white">
        <div className="page py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3 items-center min-w-0">
            <BrandLogo size={40} />
            <div className="min-w-0">
              <p className="text-xs text-emerald-300 uppercase tracking-wide">
                Painel do organizador
              </p>
              <h1 className="text-xl sm:text-2xl font-bold break-words">
                {bolao.nome}
              </h1>
              <p className="text-sm text-slate-300">
                {info.icone} {bolao.modalidade} · Concurso #{bolao.concurso_numero}
                {bolao.data_sorteio && (
                  <>
                    {" "}
                    · Sorteio:{" "}
                    {new Date(bolao.data_sorteio).toLocaleDateString("pt-BR")}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn border-slate-700 text-white hover:bg-slate-800"
              onClick={() => setModal("avisos")}
            >
              <Bell size={16} />
              <span>Avisos & n8n</span>
              {avisosNaoLidos > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">
                  {avisosNaoLidos}
                </span>
              )}
            </button>
            <a
              className="btn"
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
            >
              Visão pública
            </a>
            <button
              className="btn primary"
              disabled={frozen || pool.busy}
              onClick={() => {
                setPrefill([]);
                setVolanteTipoJogo("normal");
                setModal("jogo");
              }}
            >
              Novo jogo
            </button>
          </div>
        </div>
      </header>

      <main className="page py-6 space-y-5">
        {/* Banner de Alerta de Concurso Vencido / Passado */}
        {isContestOverdue && (
          <section
            role="alert"
            className="p-4 sm:p-5 rounded-2xl border-2 border-amber-400 bg-amber-50 text-amber-950 space-y-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="font-bold text-base">
                  Atenção: o concurso #{bolao.concurso_numero} já passou ou foi sorteado
                </h2>
                <p className="text-sm">
                  {drawAlreadyHeldOnCaixa
                    ? `A Caixa já divulgou até o concurso #${lotteryInfo?.ultimoConcurso.numero} (${lotteryInfo?.ultimoConcurso.dataApuracao}). `
                    : "A data prevista para este concurso já foi ultrapassada. "}
                  Se vocês já registraram as apostas deste concurso, faça a apuração oficial. Se adiaram o bolão, escolha abaixo o próximo concurso da Caixa:
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {!frozen && (
                <button
                  type="button"
                  className="btn bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 font-bold"
                  onClick={() => {
                    setPrefill([]);
                    setVolanteTipoJogo("normal");
                    setModal("jogo");
                  }}
                >
                  + Cadastrar jogos do concurso #{bolao.concurso_numero}
                </button>
              )}
              <button
                type="button"
                className="btn primary"
                onClick={() => setTab("conferencia")}
              >
                Conferir resultado do concurso #{bolao.concurso_numero}
              </button>

              {availableFutureDraws.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Escolher novo concurso da Caixa"
                    value={String(targetMigrationDraw?.numero || "")}
                    onChange={(e) => setSelectedNextDraw(Number(e.target.value))}
                    className="border border-amber-400 bg-white rounded-xl px-3 py-2.5 text-sm font-semibold min-h-[44px]"
                  >
                    {availableFutureDraws.map((op) => (
                      <option key={op.numero} value={String(op.numero)}>
                        {op.rotulo}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pool.busy}
                    onClick={() => void handleMigrateOverdueContest()}
                    className="btn bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-600 font-bold"
                  >
                    Mudar para concurso #{targetMigrationDraw?.numero}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Status do Bolão + Datas */}
        <div className="card flex flex-wrap justify-between gap-4 items-center">
          <div className="space-y-1">
            <strong className="text-base block">
              {frozen
                ? "Bolão lacrado / apurado"
                : deadlinePassed
                  ? "Prazo dos convidados encerrado · Lançamento de jogos liberado para o organizador"
                  : "Participações abertas"}
            </strong>
            <p className="text-sm">
              Prazo de pagamento:{" "}
              <strong>{new Date(bolao.data_limite).toLocaleString("pt-BR")}</strong>
            </p>
            <p className="text-sm flex items-center gap-1.5 text-emerald-800 font-medium">
              <Calendar size={14} />
              <span>
                Sorteio previsto:{" "}
                <strong>
                  {bolao.data_sorteio
                    ? new Date(bolao.data_sorteio).toLocaleString("pt-BR")
                    : lotteryInfo?.proximoConcurso.numero === bolao.concurso_numero
                      ? lotteryInfo.proximoConcurso.dataProximoConcurso
                      : "Consulte na configuração"}
                </strong>
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              disabled={pool.busy}
              onClick={() => setModal("config")}
            >
              Configurar
            </button>
            <button
              className="btn"
              disabled={pool.busy}
              onClick={() => setModal("planejar")}
            >
              Planejar orçamento
            </button>
            {!frozen && (
              <button
                className="btn"
                disabled={pool.busy}
                onClick={() => {
                  if (
                    confirm(
                      "Fechar definitivamente as participações? Pagamentos, regras e jogos não poderão ser alterados.",
                    )
                  )
                    void save(
                      { ...state, bolao: { ...bolao, status: "encerrado" } },
                      "fechado",
                    );
                }}
              >
                Fechar participações
              </button>
            )}
            <button
              className="btn"
              disabled={pool.busy}
              onClick={() => void pool.reload()}
            >
              Recarregar
            </button>
          </div>
        </div>

        {/* Resumo ao vivo do Portal Loterias Caixa */}
        {lotteryInfo && (
          <section className="card bg-gradient-to-r from-emerald-50/80 to-white border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Portal Loterias Caixa · Ao Vivo
                </span>
                <span className="text-xs text-slate-500">
                  Último sorteio #{lotteryInfo.ultimoConcurso.numero} em{" "}
                  {lotteryInfo.ultimoConcurso.dataApuracao} (
                  {lotteryInfo.ultimoConcurso.dezenas
                    .map((n) => String(n).padStart(2, "0"))
                    .join(" - ")}
                  )
                </span>
              </div>
              <p className="text-slate-800">
                Próximo concurso oficial:{" "}
                <strong>
                  #{lotteryInfo.proximoConcurso.numero} (
                  {lotteryInfo.proximoConcurso.dataProximoConcurso})
                </strong>
                {lotteryInfo.proximoConcurso.valorEstimado > 0 && (
                  <>
                    {" "}
                    · Estimativa de prêmio:{" "}
                    <strong className="text-emerald-700">
                      {currency(lotteryInfo.proximoConcurso.valorEstimado)}
                    </strong>
                  </>
                )}
                {lotteryInfo.ultimoConcurso.acumulado && (
                  <span className="ml-2 text-xs font-bold text-amber-700">
                    🔥 ACUMULADO!
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void refreshLottery()}
                disabled={loadingLottery}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={13} className={loadingLottery ? "animate-spin" : ""} />
                <span>Atualizar</span>
              </button>
              <a
                href={officialPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1"
              >
                <span>Site da Caixa</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </section>
        )}

        <div aria-live="polite">{pool.busy ? "Salvando…" : notice}</div>
        {pool.error && (
          <div className="error" role="alert">
            {pool.error}{" "}
            <button className="underline" onClick={() => void pool.reload()}>
              Recarregar dados
            </button>
          </div>
        )}

        <FinancialSummary
          bolao={bolao}
          participantes={participantes}
          jogos={jogos}
        />

        <ShareBar
          bolao={adminBolao}
          participantes={participantes}
          jogos={jogos}
          onOpenPublicView={() =>
            window.open(publicUrl, "_blank", "noopener,noreferrer")
          }
        />

        <details className="card">
          <summary className="cursor-pointer font-semibold">
            Mais ferramentas e regras
          </summary>
          <div className="flex flex-wrap gap-2 mt-4">
            <button className="btn" onClick={() => setModal("planejar")}>
              Planejar orçamento
            </button>
            <button className="btn" onClick={() => setModal("extrato")}>
              Extrato e recibos
            </button>
            <button className="btn" onClick={() => setModal("regras")}>
              Sobre o aplicativo
            </button>
            <a
              className="btn"
              href="https://www.caixa.gov.br/atendimento/Paginas/encontre-a-caixa.aspx"
              target="_blank"
              rel="noreferrer"
            >
              Localizador de lotéricas da Caixa
            </a>
            <button
              className="btn"
              disabled={pool.busy}
              onClick={() => {
                if (
                  confirm(
                    "Substituir o link público? Os links públicos e pessoais antigos deixarão de funcionar.",
                  )
                )
                  void save(state, "revogar_link");
              }}
            >
              Substituir link público
            </button>
          </div>
          <p className="text-sm mt-3">
            O cadastro do grupo não substitui o recibo de uma cota oficial da
            Caixa. A escolha de números não prevê sorteios.
          </p>
        </details>

        <nav
          aria-label="Seções do bolão"
          className="grid grid-cols-3 gap-1 bg-slate-200 rounded-xl p-1"
        >
          {(["participantes", "jogos", "conferencia"] as const).map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              className={
                "py-3 px-1 rounded-lg text-sm font-semibold " +
                (tab === t ? "bg-white shadow-sm" : "")
              }
              onClick={() => setTab(t)}
            >
              {t === "conferencia"
                ? "Conferência"
                : t === "jogos"
                  ? `Jogos${palpites.length > 0 ? ` (${palpites.length} palpites)` : ""}`
                  : "Participantes"}
            </button>
          ))}
        </nav>

        <fieldset disabled={pool.busy} className="min-w-0">
          {tab === "participantes" && (
            <ParticipantList
              readOnly={frozen}
              bolao={bolao}
              participantes={participantes}
              onToggleStatus={(id) =>
                void save(
                  {
                    ...state,
                    participantes: participantes.map((p) =>
                      p.id === id
                        ? p.status_pagamento === "Pago"
                          ? {
                              ...p,
                              status_pagamento: "Pendente",
                              cotas_pagas: 0,
                              cota_entregue: false,
                              cota_entregue_em: undefined,
                            }
                          : {
                              ...p,
                              status_pagamento: "Pago",
                              cotas_pagas: p.qtd_cotas,
                            }
                        : p,
                    ),
                  },
                  participantActionTag,
                )
              }
              onToggleCotaEntregue={(id) =>
                void save(
                  {
                    ...state,
                    participantes: participantes.map((p) =>
                      p.id === id
                        ? {
                            ...p,
                            cota_entregue: !p.cota_entregue,
                            cota_entregue_em: !p.cota_entregue
                              ? new Date().toISOString()
                              : undefined,
                          }
                        : p,
                    ),
                  },
                  "cota_entregue_atualizada",
                )
              }
              onEditParticipante={(p) => {
                setEditingParticipant(p);
                setModal("participante");
              }}
              onRemoveParticipante={(id) => {
                if (confirm("Remover participante?"))
                  void save(
                    {
                      ...state,
                      participantes: participantes.filter((p) => p.id !== id),
                    },
                    participantActionTag,
                  );
              }}
              onOpenAddModal={() => {
                setEditingParticipant(null);
                setModal("participante");
              }}
            />
          )}
          {tab === "jogos" && (
            <GamesList
              readOnly={frozen}
              jogos={jogos}
              palpites={palpites}
              modalidade={bolao.modalidade}
              onOpenNovoJogo={(tipo = "normal") => {
                setPrefill([]);
                setVolanteTipoJogo(tipo);
                setModal("jogo");
              }}
              onUsarDezenasNoVolante={(dezenas, tipo = "normal") => {
                setPrefill(dezenas);
                setVolanteTipoJogo(tipo);
                setModal("jogo");
              }}
              onRemoveJogo={(id) => {
                if (confirm("Excluir jogo?"))
                  void save(
                    {
                      ...state,
                      jogos: jogos.filter((j) => j.id !== id),
                    },
                    gameActionTag,
                  );
              }}
              onOpenAiConsultant={() => {
                const nums = Array.from(
                  { length: info.universoNumeros },
                  (_, i) => i + 1,
                );
                for (let i = nums.length - 1; i > 0; i--) {
                  const k = Math.floor(Math.random() * (i + 1));
                  [nums[i], nums[k]] = [nums[k], nums[i]];
                }
                setPrefill(nums.slice(0, info.minimoDezenas));
                setVolanteTipoJogo("normal");
                setModal("jogo");
              }}
            />
          )}
        </fieldset>

        {tab === "conferencia" && (
          <PainelConferencia
            key={bolao.modalidade}
            bolao={bolao}
            jogos={jogos}
            participantes={participantes}
            busy={pool.busy}
            onImport={() => save(state, "importar_caixa")}
            onSave={(r) =>
              save(
                { ...state, bolao: { ...bolao, resultado: r } },
                "resultado_manual",
              )
            }
            onImportExtra={(targetModalidade, targetConcurso) =>
              pool.save(state, "importar_caixa_extra", false, {
                targetModalidade,
                targetConcurso,
              })
            }
            onSaveExtra={(rExtra) => {
              const prevExtras = (bolao.resultados_extras || []).filter(
                (x) =>
                  !(
                    x.modalidade === rExtra.modalidade &&
                    x.concurso === rExtra.concurso
                  ),
              );
              return save(
                {
                  ...state,
                  bolao: {
                    ...bolao,
                    resultados_extras: [...prevExtras, rExtra],
                  },
                },
                "resultado_extra_manual",
              );
            }}
          />
        )}

        {state.history && (
          <details className="card">
            <summary>Histórico de gravações ({state.history.length})</summary>
            <ul className="text-sm mt-3 space-y-2">
              {state.history
                .slice()
                .reverse()
                .map((h, i) => (
                  <li key={i}>
                    {new Date(h.at).toLocaleString("pt-BR")} · {h.action}
                    <span className="block break-all text-xs text-slate-500">
                      Hash do registro: {h.digest}
                    </span>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </main>

      {modal === "jogo" && (
        <VolanteModal
          isOpen
          onClose={() => setModal(null)}
          onSaveJogo={addGame}
          onSaveJogosBatch={addGamesBatch}
          bolaoId={bolao.id}
          initialDezenas={prefill}
          initialTipoJogo={volanteTipoJogo}
          modalidade={bolao.modalidade}
          concursoBolao={bolao.concurso_numero}
        />
      )}
      {modal === "participante" && (
        <AddParticipantModal
          isOpen
          onClose={() => {
            setEditingParticipant(null);
            setModal(null);
          }}
          onAdd={addParticipant}
          onAddBatch={addParticipantsBatch}
          onEdit={editParticipant}
          participanteEditando={editingParticipant}
          bolaoId={bolao.id}
          valorCota={bolao.valor_cota}
        />
      )}
      {modal === "config" && (
        <ConfigurarBolaoModal
          isOpen
          onClose={() => setModal(null)}
          bolaoAtual={bolao}
          participanteOrganizadorAtual={participanteOrganizador}
          busy={pool.busy}
          frozen={frozen}
          onSalvarBolao={async (b, orgConfig) => {
            const nextParticipants = syncOrganizerParticipant(
              bolao.id,
              b.nome_organizador,
              participantes,
              orgConfig,
            );
            const ok = await save({
              ...state,
              bolao: b,
              participantes: nextParticipants,
            });
            if (ok) setModal(null);
            return ok;
          }}
        />
      )}
      {modal === "extrato" && (
        <PrintReportModal
          isOpen
          onClose={() => setModal(null)}
          bolao={bolao}
          participantes={participantes}
          jogos={jogos}
        />
      )}
      {modal === "planejar" && (
        <PlanejadorModal
          bolao={bolao}
          participantes={participantes}
          jogos={jogos}
          onClose={() => setModal(null)}
          onIrParaVolante={!frozen ? (qtdDezenas) => {
            const nums = Array.from({ length: info.universoNumeros }, (_, i) => i + 1);
            for (let i = nums.length - 1; i > 0; i--) {
              const k = Math.floor(Math.random() * (i + 1));
              [nums[i], nums[k]] = [nums[k], nums[i]];
            }
            setPrefill(nums.slice(0, qtdDezenas));
            setModal("jogo");
          } : undefined}
        />
      )}
      {modal === "regras" && (
        <LegalFaqModal isOpen onClose={() => setModal(null)} />
      )}
      {modal === "avisos" && (
        <AvisosN8nModal
          isOpen
          onClose={() => setModal(null)}
          bolao={bolao}
          adminToken={pool.adminToken}
          eventos={eventos}
          onAckAll={pool.ackEvents}
        />
      )}
    </div>
  );
}
