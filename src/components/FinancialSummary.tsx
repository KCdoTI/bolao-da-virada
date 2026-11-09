import React from 'react';
import { DollarSign, CheckCircle2, Clock, Ticket } from 'lucide-react';
import { Bolao, Participante, Jogo } from '../types';

interface FinancialSummaryProps {
  bolao: Bolao;
  participantes: Participante[];
  jogos: Jogo[];
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  bolao,
  participantes,
  jogos,
}) => {
  const totalCotas = participantes.reduce((acc, p) => acc + p.qtd_cotas, 0);
  const cotasPagas = participantes
    .filter((p) => p.status_pagamento === 'Pago')
    .reduce((acc, p) => acc + p.qtd_cotas, 0);
  const cotasPendentes = totalCotas - cotasPagas;

  const totalArrecadado = cotasPagas * bolao.valor_cota;
  const metaPotencial = totalCotas * bolao.valor_cota;
  const percentualConfirmado = totalCotas > 0 ? Math.round((cotasPagas / totalCotas) * 100) : 0;
  const totalDezenas = jogos.reduce((acc, j) => acc + j.dezenas.length, 0);

  return (
    <section aria-label="Resumo Financeiro do Bolão" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-6">
      {/* 1. Total Arrecadado */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between min-w-0 transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="text-[11px] uppercase tracking-wider font-semibold">Arrecadado</span>
          <DollarSign size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>
        <div className="my-2 min-w-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums truncate">
            R$ {totalArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Meta: R$ {metaPotencial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${percentualConfirmado}%` }}
          />
        </div>
      </div>

      {/* 2. Cotas Pagas */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between min-w-0 transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="text-[11px] uppercase tracking-wider font-semibold">Cotas Pagas</span>
          <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>
        <div className="my-2 min-w-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums truncate">
            {cotasPagas}{' '}
            <span className="text-xs font-normal text-slate-400">/ {totalCotas} cotas</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate">
            {percentualConfirmado}% do bolão quitado
          </div>
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          R$ {bolao.valor_cota.toFixed(2)} por cota
        </div>
      </div>

      {/* 3. Cotas Pendentes */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between min-w-0 transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="text-[11px] uppercase tracking-wider font-semibold">Pendentes</span>
          <Clock size={15} className="text-amber-500 shrink-0" />
        </div>
        <div className="my-2 min-w-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums truncate">
            {cotasPendentes}{' '}
            <span className="text-xs font-normal text-slate-400">cotas</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            R$ {(cotasPendentes * bolao.valor_cota).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a receber
          </div>
        </div>
        <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium truncate">
          {participantes.filter((p) => p.status_pagamento === 'Pendente').length} participantes
        </div>
      </div>

      {/* 4. Jogos Registrados */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between min-w-0 transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="text-[11px] uppercase tracking-wider font-semibold">Jogos Lotérica</span>
          <Ticket size={15} className="text-blue-500 shrink-0" />
        </div>
        <div className="my-2 min-w-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums truncate">
            {jogos.length}{' '}
            <span className="text-xs font-normal text-slate-400">apostas</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {totalDezenas} dezenas preenchidas
          </div>
        </div>
        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate">
          Média: {jogos.length > 0 ? (totalDezenas / jogos.length).toFixed(1) : 0} dezenas/jogo
        </div>
      </div>
    </section>
  );
};
