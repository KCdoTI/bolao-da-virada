import React, { useState } from "react";
import { Bell, Check, Copy, Server } from "lucide-react";
import type { Bolao, NotificacaoEvento } from "../types";
import { Dialog } from "./Dialog";

export function AvisosN8nModal({
  isOpen,
  onClose,
  bolao,
  adminToken,
  eventos = [],
  onAckAll,
}: {
  isOpen: boolean;
  onClose: () => void;
  bolao: Bolao;
  adminToken: string;
  eventos?: NotificacaoEvento[];
  onAckAll: (lastSeq: number) => Promise<boolean>;
}) {
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  if (!isOpen) return null;

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://bolao-da-virada-hazel.vercel.app";
  const eventsUrl = `${baseUrl}/api/eventos?unack=1`;
  const ackUrl = `${baseUrl}/api/eventos`;
  const ultimoSeq = eventos.length > 0 ? eventos[eventos.length - 1].seq : 0;
  const naoLidos = eventos.filter((e) => !e.lido);

  // Template de Workflow n8n pronto para importar no Raspberry Pi
  const n8nWorkflowJson = JSON.stringify(
    {
      name: `Avisos WhatsApp — ${bolao.nome}`,
      nodes: [
        {
          parameters: {
            rule: {
              interval: [{ field: "minutes", minutesInterval: 2 }],
            },
          },
          name: "A cada 2 minutos",
          type: "n8n-nodes-base.scheduleTrigger",
          typeVersion: 1.2,
          position: [220, 300],
        },
        {
          parameters: {
            method: "GET",
            url: eventsUrl,
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "Authorization",
                  value: `Bearer ${adminToken}`,
                },
              ],
            },
          },
          name: "Buscar Avisos Novos do Bolão",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [460, 300],
        },
        {
          parameters: {
            fieldToSplitOut: "eventos",
            options: {},
          },
          name: "Separar Eventos",
          type: "n8n-nodes-base.splitOut",
          typeVersion: 1,
          position: [700, 300],
        },
        {
          parameters: {
            method: "POST",
            url: ackUrl,
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "Authorization",
                  value: `Bearer ${adminToken}`,
                },
              ],
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: "ackUpTo",
                  value: "={{ $json.seq }}",
                },
              ],
            },
          },
          name: "Confirmar Leitura (Evitar Duplicidade)",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [1160, 300],
        },
      ],
      connections: {
        "A cada 2 minutos": {
          main: [[{ node: "Buscar Avisos Novos do Bolão", type: "main", index: 0 }]],
        },
        "Buscar Avisos Novos do Bolão": {
          main: [[{ node: "Separar Eventos", type: "main", index: 0 }]],
        },
      },
    },
    null,
    2,
  );

  return (
    <Dialog title="Avisos do Bolão & Integração n8n (Raspberry)" onClose={onClose}>
      <div className="space-y-5">
        {/* Lista de eventos recentes */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Bell size={16} className="text-emerald-700" />
              <span>
                Eventos recentes ({naoLidos.length} novo(s) / {eventos.length} total)
              </span>
            </h3>
            {naoLidos.length > 0 && (
              <button
                type="button"
                onClick={() => void onAckAll(ultimoSeq)}
                className="btn text-xs"
              >
                Marcar todos como lidos
              </button>
            )}
          </div>

          {eventos.length === 0 ? (
            <p className="text-sm text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-200">
              Nenhum aviso gerado ainda. Quando um participante aceitar as regras,
              clicar em &ldquo;Já fiz o PIX&rdquo; ou enviar um palpite, ele aparecerá aqui
              e na fila do n8n.
            </p>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {eventos
                .slice()
                .reverse()
                .map((ev) => (
                  <li
                    key={ev.seq}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      ev.lido
                        ? "bg-white border-slate-200 text-slate-600"
                        : "bg-emerald-50 border-emerald-300 text-slate-900"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <strong>
                        #{ev.seq} · {ev.titulo}
                      </strong>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {new Date(ev.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="whitespace-pre-line text-slate-600 font-mono text-[11px]">
                      {ev.mensagem_whatsapp}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* Configuração do n8n no Raspberry Pi */}
        <section className="p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
            <Server size={16} />
            <span>Conectar ao seu n8n + WhatsApp no Raspberry Pi</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Como o Raspberry roda na sua rede local/Tailscale, usamos o modo{" "}
            <strong>Pull Seguro</strong> (sem abrir portas no roteador): o n8n
            consulta a fila deste bolão a cada 2 minutos, envia{" "}
            <code className="text-emerald-300">$json.mensagem_whatsapp</code> no seu
            nó de WhatsApp e confirma a leitura.
          </p>

          <div className="space-y-1">
            <span className="text-slate-400 block">Endpoint de consulta (GET):</span>
            <code className="block p-2 rounded-lg bg-slate-950 text-emerald-300 break-all">
              {eventsUrl}
            </code>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(n8nWorkflowJson);
                setCopiedWorkflow(true);
                setTimeout(() => setCopiedWorkflow(false), 2500);
              }}
              className="btn primary text-xs"
            >
              {copiedWorkflow ? <Check size={14} /> : <Copy size={14} />}
              <span>
                {copiedWorkflow
                  ? "Workflow n8n copiado! Cole no canvas do n8n"
                  : "Copiar Workflow n8n pronto (JSON)"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `URL: ${eventsUrl}\nHeader Authorization: Bearer ${adminToken}`,
                );
                setCopiedEndpoint(true);
                setTimeout(() => setCopiedEndpoint(false), 2500);
              }}
              className="btn border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
            >
              {copiedEndpoint ? "Credenciais copiadas!" : "Copiar URL + Header Bearer"}
            </button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
