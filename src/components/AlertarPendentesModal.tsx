import React, { useState } from 'react';
import {
  X,
  BellRing,
  Send,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Users,
  Clock,
  Server,
  AlertTriangle,
} from 'lucide-react';
import { Bolao, Participante } from '../types';
import {
  buildWhatsAppReminderGroupMessage,
  buildWhatsAppIndividualReminderMessage,
  buildWhatsAppDirectUrl,
  maskPhone,
} from '../utils/transparency';

interface AlertarPendentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bolao: Bolao;
  participantes: Participante[];
  isOrganizerView?: boolean;
}

export const AlertarPendentesModal: React.FC<AlertarPendentesModalProps> = ({
  isOpen,
  onClose,
  bolao,
  participantes,
  isOrganizerView = false,
}) => {
  const [activeTab, setActiveTab] = useState<'grupo' | 'individual' | 'automacao'>('grupo');
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('http://192.168.1.15:5678/webhook/bolao-lembrete');
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [webhookMessage, setWebhookMessage] = useState('');

  if (!isOpen) return null;

  const pendentes = participantes.filter((p) => p.status_pagamento === 'Pendente');
  const totalCotasPendentes = pendentes.reduce((acc, p) => acc + p.qtd_cotas, 0);
  const valorTotalPendente = totalCotasPendentes * bolao.valor_cota;

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#${bolao.id}`
    : `https://bolao-da-virada.app/#${bolao.id}`;

  const groupMessage = buildWhatsAppReminderGroupMessage(bolao, pendentes, publicUrl);

  const handleCopyGroup = () => {
    navigator.clipboard.writeText(groupMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleOpenGroupWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(groupMessage)}`;
    window.open(url, '_blank');
  };

  const handleSendWebhook = async () => {
    setWebhookStatus('sending');
    setWebhookMessage('');
    try {
      const payload = {
        evento: 'alerta_participantes_pendentes',
        timestamp: new Date().toISOString(),
        bolao: {
          id: bolao.id,
          nome: bolao.nome,
          modalidade: bolao.modalidade,
          data_limite: bolao.data_limite,
          chave_pix: bolao.chave_pix_organizador,
        },
        resumo: {
          total_pendentes: pendentes.length,
          cotas_pendentes: totalCotasPendentes,
          valor_pendente: valorTotalPendente,
        },
        destinatarios: pendentes.map((p) => ({
          id: p.id,
          nome: p.nome,
          telefone: p.telefone,
          qtd_cotas: p.qtd_cotas,
          valor_devido: p.qtd_cotas * bolao.valor_cota,
          mensagem: buildWhatsAppIndividualReminderMessage(p, bolao, publicUrl),
        })),
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        setWebhookStatus('success');
        setWebhookMessage('Disparo enviado com sucesso para o nó de automação.');
      } else {
        setWebhookStatus('error');
        setWebhookMessage(`Nó respondeu com status ${res.status}. Verifique o workflow.`);
      }
    } catch (err: any) {
      setWebhookStatus('error');
      setWebhookMessage(`Falha de conexão com o nó (${err.message || 'offline'}). Verifique se o Raspberry Pi / n8n está acessível.`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-alertar-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <BellRing size={20} />
            </div>
            <div>
              <h2 id="modal-alertar-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Alertar Participantes Pendentes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pendentes.length} {pendentes.length === 1 ? 'cotista pendente' : 'cotistas pendentes'} • {totalCotasPendentes} {totalCotasPendentes === 1 ? 'cota' : 'cotas'} (R$ {valorTotalPendente.toFixed(2)})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumo Card */}
        <div className="px-5 pt-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {pendentes.length === 0 ? 'Todas as cotas já estão pagas!' : 'Pagamentos aguardando confirmação'}
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {pendentes.length === 0
                    ? 'Nenhum participante possui pendência financeira neste bolão.'
                    : 'Avisar os participantes ajuda a fechar as cotas antes do encerramento das lotéricas.'}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-extrabold text-sm text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                R$ {valorTotalPendente.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('grupo')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'grupo'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Lembrete para o Grupo
          </button>

          {isOrganizerView && (
            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'individual'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Cobrança Individual ({pendentes.length})
            </button>
          )}

          {isOrganizerView && (
            <button
              type="button"
              onClick={() => setActiveTab('automacao')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'automacao'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Nó de Automação (Raspberry)
            </button>
          )}
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {pendentes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Não há cotistas com pendência de pagamento no momento.
            </div>
          ) : activeTab === 'grupo' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Prévia da mensagem pronta para envio no grupo:</span>
                <span className="font-mono text-[11px]">{groupMessage.length} caracteres</span>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {groupMessage}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleOpenGroupWhatsApp}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 min-h-[44px] rounded-xl transition active:scale-[0.98] shadow-xs"
                >
                  <MessageCircle size={16} />
                  <span>Enviar para Grupo no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyGroup}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-4 py-3 min-h-[44px] rounded-xl transition border border-slate-200 dark:border-slate-700 active:scale-[0.98]"
                >
                  {copied ? (
                    <>
                      <Check size={15} className="text-emerald-500" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : activeTab === 'individual' ? (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Dispare cobranças personalizadas no chat privado de cada participante pendente:
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendentes.map((p) => {
                  const valor = p.qtd_cotas * bolao.valor_cota;
                  const individualText = buildWhatsAppIndividualReminderMessage(p, bolao, publicUrl);
                  const directUrl = buildWhatsAppDirectUrl(p.telefone, individualText);

                  return (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                          {p.nome}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {p.telefone} • {p.qtd_cotas} {p.qtd_cotas === 1 ? 'cota' : 'cotas'} (R$ {valor.toFixed(2)})
                        </div>
                      </div>

                      <a
                        href={directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 min-h-[38px] rounded-xl transition active:scale-[0.98] shrink-0"
                      >
                        <MessageCircle size={14} />
                        <span>Cobrar</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Server size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  Integração com nó n8n ou webhook do cluster Raspberry Pi para despacho automatizado de notificações via API Baileys (<code className="text-emerald-500">wa_akg</code>).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL do Webhook do Nó (Raspberry Pi / n8n):
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="http://192.168.1.15:5678/webhook/..."
                  className="w-full text-xs px-3.5 py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {webhookMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    webhookStatus === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                  }`}
                >
                  {webhookStatus === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}
                  <span>{webhookMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSendWebhook}
                disabled={webhookStatus === 'sending'}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-bold py-3 min-h-[44px] rounded-xl transition active:scale-[0.98] disabled:opacity-60"
              >
                <Send size={15} />
                <span>
                  {webhookStatus === 'sending' ? 'Enviando ao Nó...' : 'Disparar Notificações via Nó'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-4 py-2 min-h-[38px] rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
