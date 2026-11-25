import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Bolao, Participante } from "../types";
import { CATALOGO_MODALIDADES, GRUPOS_MODALIDADES, getModalidadeInfo } from "../constants/lotteryCatalog";
import { useLotteryInfo } from "../hooks/useLotteryInfo";
import { Dialog } from "./Dialog";
import { currency } from "./PainelConferencia";

export interface OrganizadorParticipacaoConfig {
  participa: boolean;
  cotas: number;
  telefone: string;
  pago: boolean;
}

function localDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function ConfigurarBolaoModal({
  isOpen,
  onClose,
  bolaoAtual,
  participanteOrganizadorAtual = null,
  onSalvarBolao,
  busy = false,
  frozen = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  bolaoAtual: Bolao;
  participanteOrganizadorAtual?: Participante | null;
  onSalvarBolao: (
    b: Bolao,
    orgConfig?: OrganizadorParticipacaoConfig,
  ) => Promise<boolean> | void;
  busy?: boolean;
  frozen?: boolean;
}) {
  const isNew = bolaoAtual.id === "novo";
  const [draft, setDraft] = useState({
    ...bolaoAtual,
    data_limite: localDate(bolaoAtual.data_limite),
    data_sorteio: localDate(bolaoAtual.data_sorteio),
  });

  // Participação do organizador
  const [orgParticipa, setOrgParticipa] = useState(
    participanteOrganizadorAtual ? true : isNew,
  );
  const [orgCotas, setOrgCotas] = useState(
    participanteOrganizadorAtual?.qtd_cotas || 1,
  );
  const [orgTelefone, setOrgTelefone] = useState(
    participanteOrganizadorAtual?.telefone || "",
  );
  const [orgPago, setOrgPago] = useState(
    participanteOrganizadorAtual
      ? participanteOrganizadorAtual.status_pagamento === "Pago"
      : true,
  );

  // Modo de seleção de concurso: pela lista da Caixa ou manual avançado
  const [modoConcursoManual, setModoConcursoManual] = useState(false);
  const [autoAppliedModality, setAutoAppliedModality] = useState<string>("");
  const [error, setError] = useState("");

  const { lotteryInfo, loadingLottery, lotteryError, refreshLottery } =
    useLotteryInfo(draft.modalidade, isOpen);

  const change = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  // Quando criando um bolão novo (ou trocando a modalidade), aplica automaticamente o próximo concurso oficial da Caixa
  useEffect(() => {
    if (!isOpen || !lotteryInfo || frozen) return;
    if (!isNew && autoAppliedModality === "") {
      // Na edição de um bolão existente, não sobrescreve na abertura inicial, apenas se o usuário trocar a modalidade
      setAutoAppliedModality(draft.modalidade);
      return;
    }
    if (autoAppliedModality === lotteryInfo.modalidade) return;

    const opcoes = lotteryInfo.opcoesConcursos;
    const preferida =
      draft.modalidade === "Mega da Virada"
        ? opcoes.find((o) => o.tipo === "especial_oficial") || opcoes[0]
        : opcoes[0];

    if (preferida) {
      setDraft((prev) => ({
        ...prev,
        concurso_numero: preferida.numero,
        data_sorteio: localDate(preferida.dataSorteioIso),
        data_limite: localDate(preferida.prazoSugeridoIso),
      }));
      setModoConcursoManual(false);
    }
    setAutoAppliedModality(lotteryInfo.modalidade);
  }, [isOpen, isNew, frozen, lotteryInfo, draft.modalidade, autoAppliedModality]);

  if (!isOpen) return null;

  const opcoesConcursos = lotteryInfo?.opcoesConcursos || [];
  const concursoNaLista = opcoesConcursos.some(
    (o) => o.numero === draft.concurso_numero,
  );

  const handleSelectConcurso = (val: string) => {
    if (val === "manual") {
      setModoConcursoManual(true);
      return;
    }
    setModoConcursoManual(false);
    const num = Number(val);
    const found = opcoesConcursos.find((o) => o.numero === num);
    if (found) {
      setDraft((prev) => ({
        ...prev,
        modalidade: found.modalidadeSugerida || prev.modalidade,
        concurso_numero: found.numero,
        data_sorteio: localDate(found.dataSorteioIso),
        data_limite: localDate(found.prazoSugeridoIso),
      }));
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!draft.nome.trim()) {
        throw new Error("Informe o nome do bolão.");
      }
      if (orgParticipa && !(draft.nome_organizador || "").trim()) {
        throw new Error(
          "Informe o seu nome em 'Nome do organizador' para registrar suas cotas na lista.",
        );
      }
      const deadline = new Date(draft.data_limite).toISOString();
      const draw = draft.data_sorteio
        ? new Date(draft.data_sorteio).toISOString()
        : undefined;
      if (!frozen && Date.parse(deadline) <= Date.now()) {
        throw new Error(
          "Defina um prazo futuro para receber pagamentos e cadastrar jogos.",
        );
      }
      if (draw && Date.parse(deadline) >= Date.parse(draw)) {
        throw new Error("O prazo de pagamento do grupo deve anteceder o horário do sorteio.");
      }
      await onSalvarBolao(
        {
          ...draft,
          nome: draft.nome.trim(),
          data_limite: deadline,
          data_sorteio: draw,
        },
        {
          participa: orgParticipa,
          cotas: Math.max(1, Math.floor(orgCotas) || 1),
          telefone: orgTelefone.trim(),
          pago: orgPago,
        },
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const modInfo = getModalidadeInfo(draft.modalidade);

  return (
    <Dialog
      title={isNew ? "Criar bolão" : "Configurar bolão"}
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
              placeholder="Ex.: Bolão da Firma — Mega-Sena"
            />
          </label>

          {/* Modalidade */}
          <label>
            Modalidade da Loteria
            <select
              value={draft.modalidade}
              onChange={(e) => {
                const novaMod = e.target.value;
                const novaInfo = CATALOGO_MODALIDADES[novaMod];
                setAutoAppliedModality("");
                setDraft((prev) => ({
                  ...prev,
                  modalidade: novaMod,
                  regras: isNew && novaInfo ? novaInfo.regrasPadrao : prev.regras,
                }));
              }}
            >
              {GRUPOS_MODALIDADES.map((g) => (
                <optgroup key={g.grupo} label={g.grupo}>
                  {g.opcoes.map((m) => (
                    <option key={m} value={m}>
                      {CATALOGO_MODALIDADES[m]?.icone} {m}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {/* Painel de Concurso puxado ao vivo da Caixa */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-900">
                {modInfo.icone} Concursos da Caixa ({modInfo.modalidadeBase})
              </span>
              <button
                type="button"
                onClick={() => void refreshLottery()}
                disabled={loadingLottery}
                className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={loadingLottery ? "animate-spin" : ""} />
                <span>{loadingLottery ? "Consultando Caixa…" : "Atualizar dados"}</span>
              </button>
            </div>

            {lotteryInfo && (
              <p className="text-xs text-slate-700">
                Último apurado: <strong>#{lotteryInfo.ultimoConcurso.numero}</strong> (
                {lotteryInfo.ultimoConcurso.dataApuracao}) ·{" "}
                {lotteryInfo.ultimoConcurso.acumulado ? "Acumulou!" : "Teve ganhador"} ·{" "}
                {lotteryInfo.proximoConcurso.valorEstimado > 0 && (
                  <>
                    Prêmio estimado:{" "}
                    <strong>{currency(lotteryInfo.proximoConcurso.valorEstimado)}</strong>
                  </>
                )}
              </p>
            )}

            {lotteryError && (
              <p className="text-xs text-amber-800">
                {lotteryError} Você pode informar o concurso manualmente abaixo.
              </p>
            )}

            {opcoesConcursos.length > 0 && !modoConcursoManual ? (
              <label className="text-xs font-semibold">
                Selecione o concurso para este bolão
                <select
                  value={concursoNaLista ? String(draft.concurso_numero) : "manual"}
                  onChange={(e) => handleSelectConcurso(e.target.value)}
                >
                  {!concursoNaLista && (
                    <option value="manual">
                      Concurso atual #{draft.concurso_numero} (personalizado)
                    </option>
                  )}
                  {opcoesConcursos.map((op) => (
                    <option key={op.numero} value={String(op.numero)}>
                      {op.rotulo}
                    </option>
                  ))}
                  <option value="manual">Outro número de concurso (avançado)…</option>
                </select>
              </label>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold">
                  Número do concurso
                  <input
                    required
                    type="number"
                    min="1"
                    value={draft.concurso_numero}
                    onChange={(e) => change("concurso_numero", Number(e.target.value))}
                  />
                </label>
                {opcoesConcursos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setModoConcursoManual(false);
                      handleSelectConcurso(String(opcoesConcursos[0].numero));
                    }}
                    className="text-xs underline text-emerald-800 cursor-pointer"
                  >
                    Voltar para a lista automática de concursos da Caixa
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Datas preenchidas automaticamente a partir do concurso, mas ajustáveis */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label>
              Prazo limite de pagamento do grupo
              <input
                required
                type="datetime-local"
                value={draft.data_limite}
                onChange={(e) => change("data_limite", e.target.value)}
              />
            </label>
            <label>
              Data prevista do sorteio
              <input
                required
                type="datetime-local"
                value={draft.data_sorteio || ""}
                onChange={(e) => change("data_sorteio", e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-slate-600">
            A data prevista do sorteio fica visível para todos os participantes. No
            prazo limite, a edição de pagamentos e jogos encerra automaticamente.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
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
                required={orgParticipa}
                maxLength={120}
                value={draft.nome_organizador || ""}
                onChange={(e) => change("nome_organizador", e.target.value)}
                placeholder="Ex.: Kelvin Castro"
              />
            </label>
          </div>

          <label>
            Chave PIX do organizador (para os cotistas pagarem direto a você)
            <input
              maxLength={200}
              value={draft.chave_pix_organizador}
              onChange={(e) => change("chave_pix_organizador", e.target.value)}
              placeholder="CPF, e-mail, celular ou chave aleatória"
            />
          </label>

          {/* Participação do Organizador no Bolão */}
          <section className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={orgParticipa}
                onChange={(e) => setOrgParticipa(e.target.checked)}
                className="mt-1 w-4 h-4 shrink-0"
              />
              <div>
                <strong className="text-sm block">
                  Eu (organizador) participo deste bolão com cotas próprias
                </strong>
                <span className="text-xs text-slate-600">
                  Se desmarcado, você apenas administra o bolão sem entrar na divisão do prêmio.
                </span>
              </div>
            </label>

            {orgParticipa && (
              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <label className="text-xs">
                  Minhas cotas no bolão
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={orgCotas}
                    onChange={(e) =>
                      setOrgCotas(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                    }
                  />
                  <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                    Sua parte: {currency(orgCotas * (Number(draft.valor_cota) || 0))}
                  </span>
                </label>

                <label className="text-xs">
                  Meu WhatsApp (opcional)
                  <input
                    type="tel"
                    maxLength={30}
                    value={orgTelefone}
                    onChange={(e) => setOrgTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </label>

                <label className="sm:col-span-2 flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={orgPago}
                    onChange={(e) => setOrgPago(e.target.checked)}
                    className="w-4 h-4 shrink-0"
                  />
                  <span>Marcar minhas cotas como já confirmadas/pagas</span>
                </label>
              </div>
            )}
          </section>

          <label>
            Regras acordadas com o grupo (uma por linha)
            <textarea
              rows={4}
              value={draft.regras?.join("\n") || ""}
              onChange={(e) =>
                change("regras", e.target.value.split("\n").filter(Boolean))
              }
            />
          </label>
        </fieldset>

        {frozen && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl">
            Participações encerradas. As condições deste bolão estão congeladas.
            Caso o concurso tenha vencido sem apostas/apuração, use o alerta no painel principal para migrar ao próximo concurso.
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
              : isNew
                ? "Criar e guardar bolão"
                : "Salvar configurações"}
          </button>
        )}
      </form>
    </Dialog>
  );
}
