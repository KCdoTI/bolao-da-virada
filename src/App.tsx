import React, { useState } from "react";
import type { Bolao, Jogo, Participante, PoolState } from "./types";
import { usePool } from "./hooks/usePool";
import { BrandLogo } from "./components/BrandLogo";
import { FinancialSummary } from "./components/FinancialSummary";
import { ShareBar } from "./components/ShareBar";
import { ParticipantList } from "./components/ParticipantList";
import { GamesList } from "./components/GamesList";
import { PainelConferencia } from "./components/PainelConferencia";
import { PublicTransparencyView } from "./components/PublicTransparencyView";
import { VolanteModal } from "./components/VolanteModal";
import { AddParticipantModal } from "./components/AddParticipantModal";
import { PrintReportModal } from "./components/PrintReportModal";
import { ConfigurarBolaoModal } from "./components/ConfigurarBolaoModal";
import { PlanejadorModal } from "./components/PlanejadorModal";
import { LegalFaqModal } from "./components/LegalFaqModal";
import { getModalidadeInfo } from "./constants/lotteryCatalog";

const blank: Bolao = {
  id: "novo",
  nome: "Meu bolão",
  modalidade: "Mega da Virada",
  concurso_numero: 3100,
  valor_cota: 12,
  data_limite: "2026-12-30T18:00:00-03:00",
  data_sorteio: "2027-01-01T11:00:00-03:00",
  chave_pix_organizador: "",
  status: "aberto",
  hash_slug: "novo",
  regras: [
    "Somente pagamentos confirmados antes do fechamento participam do rateio.",
    "O prêmio é dividido proporcionalmente às cotas pagas; centavos restantes seguem a regra de maiores frações.",
    "O organizador guarda os recibos originais e presta contas aos participantes.",
  ],
};
export default function App() {
  const pool = usePool();
  const [tab, setTab] = useState<"participantes" | "jogos" | "conferencia">(
    "participantes",
  );
  const [modal, setModal] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [prefill, setPrefill] = useState<number[]>([]);
  const state = pool.data;
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
          Cadastre participantes, registre jogos e compartilhe a conferência do
          grupo.
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
            onSalvarBolao={async (b) => {
              const ok = await pool.save(
                { bolao: b, participantes: [], jogos: [] },
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
          onReload={() => void pool.reload()}
        />
        {pool.error && (
          <p role="alert" className="error">
            {pool.error}
          </p>
        )}
      </>
    );
  const { bolao, participantes, jogos } = state;
  const adminBolao = { ...bolao, admin_token: pool.adminToken };
  const frozen =
    !!bolao.fechado_em || Date.now() >= Date.parse(bolao.data_limite);
  const info = getModalidadeInfo(bolao.modalidade);
  const addParticipant = async (p: Omit<Participante, "id">) => {
    const ok = await save({
      ...state,
      participantes: [...participantes, { ...p, id: crypto.randomUUID() }],
    });
    if (ok) setModal(null);
    return ok;
  };
  const addGame = async (j: Omit<Jogo, "id" | "criado_em">) => {
    if (j.foto_url?.startsWith("data:")) {
      const url = await pool.uploadReceipt(j.foto_url);
      if (!url) return false;
      j = { ...j, foto_url: url };
    }
    if (
      await save({
        ...state,
        jogos: [
          ...jogos,
          {
            ...j,
            id: crypto.randomUUID(),
            criado_em: new Date().toISOString(),
          },
        ],
      })
    ) {
      setModal(null);
      setTab("jogos");
      return true;
    }
    return false;
  };
  const publicUrl = "/#b-" + bolao.hash_slug;
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
                {bolao.modalidade} · Concurso {bolao.concurso_numero}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
                setModal("jogo");
              }}
            >
              Novo jogo
            </button>
          </div>
        </div>
      </header>
      <main className="page py-6 space-y-5">
        <div className="card flex flex-wrap justify-between gap-4 items-center">
          <div>
            <strong>
              {frozen ? "Participações encerradas" : "Participações abertas"}
            </strong>
            <p className="text-sm">
              Prazo: {new Date(bolao.data_limite).toLocaleString("pt-BR")}
            </p>
            {bolao.data_sorteio && (
              <p className="text-sm">
                Sorteio previsto:{" "}
                {new Date(bolao.data_sorteio).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              disabled={pool.busy}
              onClick={() => setModal("config")}
            >
              Configurar
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
            Ferramentas e regras
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
                  ? "Jogos"
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
                void save({
                  ...state,
                  participantes: participantes.map((p) =>
                    p.id === id
                      ? {
                          ...p,
                          status_pagamento:
                            p.status_pagamento === "Pago" ? "Pendente" : "Pago",
                        }
                      : p,
                  ),
                })
              }
              onRemoveParticipante={(id) => {
                if (confirm("Remover participante?"))
                  void save({
                    ...state,
                    participantes: participantes.filter((p) => p.id !== id),
                  });
              }}
              onOpenAddModal={() => setModal("participante")}
            />
          )}
          {tab === "jogos" && (
            <GamesList
              readOnly={frozen}
              jogos={jogos}
              onOpenNovoJogo={() => {
                setPrefill([]);
                setModal("jogo");
              }}
              onRemoveJogo={(id) => {
                if (confirm("Excluir jogo?"))
                  void save({
                    ...state,
                    jogos: jogos.filter((j) => j.id !== id),
                  });
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
          bolaoId={bolao.id}
          initialDezenas={prefill}
          modalidade={bolao.modalidade}
        />
      )}
      {modal === "participante" && (
        <AddParticipantModal
          isOpen
          onClose={() => setModal(null)}
          onAdd={addParticipant}
          bolaoId={bolao.id}
          valorCota={bolao.valor_cota}
        />
      )}
      {modal === "config" && (
        <ConfigurarBolaoModal
          isOpen
          onClose={() => setModal(null)}
          bolaoAtual={bolao}
          busy={pool.busy}
          frozen={frozen}
          onSalvarBolao={async (b) => {
            const ok = await save({ ...state, bolao: b });
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
        <PlanejadorModal bolao={bolao} onClose={() => setModal(null)} />
      )}
      {modal === "regras" && (
        <LegalFaqModal isOpen onClose={() => setModal(null)} />
      )}
    </div>
  );
}
