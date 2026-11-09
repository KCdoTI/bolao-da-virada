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
    <section aria-label="Resumo Financeiro do Bolão" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. Total Arrecadado */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between min-w-0 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="text-xs uppercase tracking-wider font-bold">Arrecadado</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <DollarSign size={16} />
          </div>
        </div>
        <div className="my-3 min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums truncate">
            R$ {totalArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            Meta: R$ {metaPotencial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${percentualConfirmado}%` }}
          />
        </div>
      </div>

      {/* 2. Cotas Pagas */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between min-w-0 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="text-xs uppercase tracking-wider font-bold">Cotas Pagas</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <div className="my-3 min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums truncate">
            {cotasPagas}{' '}
            <span className="text-sm font-normal text-slate-400">/ {totalCotas} cotas</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 truncate">
            {percentualConfirmado}% do bolão quitado
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
          R$ {bolao.valor_cota.toFixed(2)} por cota
        </div>
      </div>

      {/* 3. Cotas Pendentes */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between min-w-0 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="text-xs uppercase tracking-wider font-bold">Pendentes</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
            <Clock size={16} />
          </div>
        </div>
        <div className="my-3 min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums truncate">
            {cotasPendentes}{' '}
            <span className="text-sm font-normal text-slate-400">cotas</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            R$ {(cotasPendentes * bolao.valor_cota).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a receber
          </div>
        </div>
        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold truncate">
          {participantes.filter((p) => p.status_pagamento === 'Pendente').length} participantes pendentes
        </div>
      </div>

      {/* 4. Jogos Registrados */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between min-w-0 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <span className="text-xs uppercase tracking-wider font-bold">Jogos Lotérica</span>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Ticket size={16} />
          </div>
        </div>
        <div className="my-3 min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums truncate">
            {jogos.length}{' '}
            <span className="text-sm font-normal text-slate-400">apostas</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {totalDezenas} dezenas preenchidas
          </div>
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
          Média: {jogos.length > 0 ? (totalDezenas / jogos.length).toFixed(1) : 0} dezenas/jogo
        </div>
      </div>
    </section>
  );
};
