import React, { useState } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Phone,
  Filter,
  BellRing,
  MessageCircle,
  Copy,
  Check,
  Link,
  Share2,
} from 'lucide-react';
import { Participante, Bolao } from '../types';
import { AlertarPendentesModal } from './AlertarPendentesModal';
import {
  buildWhatsAppIndividualReminderMessage,
  buildWhatsAppIndividualParticipantLinkMessage,
  buildWhatsAppDirectUrl,
} from '../utils/transparency';

interface ParticipantListProps {
  bolao: Bolao;
  participantes: Participante[];
  onToggleStatus: (id: string) => void;
  onRemoveParticipante: (id: string) => void;
  onOpenAddModal: () => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  bolao,
  participantes,
  onToggleStatus,
  onRemoveParticipante,
  onOpenAddModal,
}) => {
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'Pago' | 'Pendente'>('todos');
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendentes = participantes.filter((p) => p.status_pagamento === 'Pendente');

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#${bolao.id}`
    : `https://bolao-da-virada.app/#${bolao.id}`;

  const copyParticipantLink = (p: Participante) => {
    const personalUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/#cota-${p.token_acesso || p.id}`
      : `/#cota-${p.token_acesso || p.id}`;
    navigator.clipboard.writeText(personalUrl);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = participantes.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.telefone.includes(search);
    const matchesStatus =
      filtroStatus === 'todos' || p.status_pagamento === filtroStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
      {/* Top Bar da Lista */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
            Participantes do Bolão ({participantes.length})
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendentes.length > 0 && (
            <button
              type="button"
              onClick={() => setIsAlertModalOpen(true)}
              aria-label={`Cobrar participantes pendentes (${pendentes.length})`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold py-2.5 px-3.5 min-h-[40px] rounded-xl border border-amber-500/30 transition-all duration-150 active:scale-[0.98]"
            >
              <BellRing size={15} className="text-amber-500" />
              <span>Cobrar Pendentes ({pendentes.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-3.5 min-h-[40px] rounded-xl transition-all duration-150 active:scale-[0.98] shadow-xs"
          >
            <PlusCircle size={15} />
            <span>Adicionar Cotista</span>
          </button>
        </div>
      </div>

      {/* Controles de Busca e Filtro */}
      <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm sm:text-xs pl-9 pr-3 py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 self-stretch sm:self-auto overflow-x-auto">
          <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">Filtrar:</span>
          {(['todos', 'Pago', 'Pendente'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFiltroStatus(st)}
              className={`flex-1 sm:flex-initial text-xs font-semibold px-3 py-2 min-h-[38px] rounded-lg transition-all duration-150 active:scale-[0.98] ${
                filtroStatus === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {st === 'todos' ? 'Todos' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela / Lista de Cotistas */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhum participante encontrado com os filtros atuais.
          </div>
        ) : (
          filtered.map((participante) => {
            const isPago = participante.status_pagamento === 'Pago';
            const totalParticipante = participante.qtd_cotas * bolao.valor_cota;

            return (
              <div
                key={participante.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
              >
                {/* Nome & Telefone */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                    {participante.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                      {participante.nome}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                      <Phone size={11} className="text-slate-400" />
                      <span>{participante.telefone}</span>
                    </div>
                  </div>
                </div>

                {/* Cotas & Ação de Pagamento */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                      {participante.qtd_cotas} {participante.qtd_cotas === 1 ? 'cota' : 'cotas'}
                    </span>
                    <strong className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      R$ {totalParticipante.toFixed(2)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botão de Alternar Status de Pagamento */}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(participante.id)}
                      aria-label={`Alternar pagamento de ${participante.nome}: atualmente ${participante.status_pagamento}`}
                      className={`text-xs font-semibold px-3.5 py-2 min-h-[40px] rounded-xl transition-all duration-150 flex items-center gap-1.5 active:scale-[0.98] border shadow-xs ${
                        isPago
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      {isPago ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Pago</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} className="text-amber-500" />
                          <span>Pendente</span>
                        </>
                      )}
                    </button>

                    {/* Copiar Link Individual do Cotista */}
                    <button
                      type="button"
                      onClick={() => copyParticipantLink(participante)}
                      aria-label={`Copiar link exclusivo de ${participante.nome}`}
                      title={copiedId === participante.id ? 'Link pessoal copiado!' : `Copiar link exclusivo para ${participante.nome}`}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-emerald-500 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 active:scale-[0.95] transition-all duration-150 cursor-pointer"
                    >
                      {copiedId === participante.id ? <Check size={16} className="text-emerald-500" /> : <Link size={15} />}
                    </button>

                    {/* Enviar Link / Cobrança via WhatsApp */}
                    <a
                      href={buildWhatsAppDirectUrl(
                        participante.telefone,
                        buildWhatsAppIndividualParticipantLinkMessage(
                          participante,
                          bolao,
                          `${typeof window !== 'undefined' ? window.location.origin : ''}/#cota-${participante.token_acesso || participante.id}`
                        )
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Enviar link seguro para ${participante.nome} no WhatsApp`}
                      aria-label={`Enviar link no WhatsApp para ${participante.nome}`}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:text-white rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 dark:hover:bg-emerald-600 border border-emerald-200 dark:border-emerald-800/80 active:scale-[0.95] transition-all duration-150 cursor-pointer"
                    >
                      <MessageCircle size={16} />
                    </a>

                    {/* Excluir Participante (Touch Target 40x40) */}
                    <button
                      type="button"
                      onClick={() => onRemoveParticipante(participante.id)}
                      aria-label={`Remover ${participante.nome}`}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-[0.95] transition-all duration-150 cursor-pointer"
                      title="Remover participante"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Alerta / Cobrança de Pendentes */}
      <AlertarPendentesModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        bolao={bolao}
        participantes={participantes}
        isOrganizerView={true}
      />
    </div>
  );
};
