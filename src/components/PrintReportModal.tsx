import React, { useState, useEffect } from 'react';
import { X, Printer, ShieldCheck, Download, Calendar, DollarSign, Users, Ticket, Copy, Check, FileCheck } from 'lucide-react';
import { Bolao, Participante, Jogo } from '../types';
import { generateCanonicalManifest, calculateSha256 } from '../utils/transparency';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bolao: Bolao;
  participantes: Participante[];
  jogos: Jogo[];
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  bolao,
  participantes,
  jogos,
}) => {
  const [sha256Hash, setSha256Hash] = useState<string>('Calculando...');
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const computeHash = async () => {
      try {
        const manifest = generateCanonicalManifest(bolao, participantes, jogos);
        const hash = await calculateSha256(manifest);
        setSha256Hash(hash);
      } catch (err) {
        setSha256Hash(`ERR-${bolao.hash_slug}`);
      }
    };
    computeHash();
  }, [isOpen, bolao, participantes, jogos]);

  if (!isOpen) return null;

  const cotasPagas = participantes
    .filter((p) => p.status_pagamento === 'Pago')
    .reduce((acc, p) => acc + p.qtd_cotas, 0);
  const totalCotas = participantes.reduce((acc, p) => acc + p.qtd_cotas, 0);
  const totalArrecadado = cotasPagas * bolao.valor_cota;

  const dataEmissao = new Date().toLocaleString('pt-BR');

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Relatório de Prestação de Contas do Bolão"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Header de Ação (não impresso) */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-emerald-400" />
            <h3 className="font-bold text-sm">Extrato Oficial com Assinatura SHA-256 (PDF/Impressão)</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all duration-150 flex items-center gap-1.5 active:scale-[0.98]"
            >
              <Printer size={14} />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Fechar relatório"
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Área do Relatório Oficial (Imprimível) */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white text-slate-900 print:p-0">
          {/* Cabeçalho Oficial do Relatório */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <FileCheck size={14} className="text-emerald-700" />
                <span>RELATÓRIO OFICIAL DE TRANSPARÊNCIA E AUDITORIA CRIPTOGRÁFICA</span>
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-1">{bolao.nome}</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Modalidade: <strong>{bolao.modalidade}</strong> • Concurso <strong>#{bolao.concurso_numero}</strong> • Cota: <strong>R$ {bolao.valor_cota.toFixed(2)}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500">
              <div>Emitido em: <strong>{dataEmissao}</strong></div>
              <div>Organizador: <strong>{bolao.nome_organizador || 'Kelvin Castro'}</strong></div>
              <div>Chave PIX: <strong className="font-mono">{bolao.chave_pix_organizador}</strong></div>
            </div>
          </div>

          {/* Selo Criptográfico SHA-256 */}
          <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                <ShieldCheck size={13} />
                <span>Hash Criptográfico de Integridade (SHA-256)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyHash}
                className="print:hidden text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                title="Copiar Hash SHA-256"
              >
                {copiedHash ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedHash ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] sm:text-xs text-emerald-300 break-all select-all font-semibold">
              {sha256Hash}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Assinatura digital canônica inviolável. Qualquer alteração em bilhetes, dezenas ou participantes alterará este hash.
            </p>
          </div>

          {/* Resumo Financeiro Consolidado */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Total Arrecadado</span>
              <strong className="text-base text-emerald-700 font-black font-mono">
                R$ {totalArrecadado.toFixed(2)}
              </strong>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Cotas Confirmadas</span>
              <strong className="text-base text-slate-900 font-black font-mono">
                {cotasPagas} de {totalCotas} cotas
              </strong>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Apostas Registradas</span>
              <strong className="text-base text-slate-900 font-black font-mono">
                {jogos.length} jogos
              </strong>
            </div>
          </div>

          {/* Relação de Apostas Registradas */}
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
              <Ticket size={16} className="text-emerald-700" />
              <span>1. Apostas Oficiais Registradas na Lotérica ({jogos.length})</span>
            </h2>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Jogo #</th>
                    <th className="py-2.5 px-3">Dezenas Marcadas</th>
                    <th className="py-2.5 px-3 text-center">Qtd</th>
                    <th className="py-2.5 px-3">Código de Controle Caixa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {jogos.map((j, i) => (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold">Jogo #{jogos.length - i}</td>
                      <td className="py-2 px-3 font-bold text-emerald-800 text-sm">
                        {j.dezenas.map((d) => (d < 10 ? `0${d}` : d)).join(' - ')}
                      </td>
                      <td className="py-2 px-3 text-center">{j.dezenas.length}</td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">{j.codigo_bilhete || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Relação de Cotistas */}
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
              <Users size={16} className="text-emerald-700" />
              <span>2. Relação de Cotistas Participantes ({participantes.length})</span>
            </h2>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nome</th>
                    <th className="py-2.5 px-3">Telefone</th>
                    <th className="py-2.5 px-3 text-center">Cotas</th>
                    <th className="py-2.5 px-3 text-right">Valor Aportado</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {participantes.map((p) => {
                    const isPago = p.status_pagamento === 'Pago';
                    return (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{p.nome}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">{p.telefone}</td>
                        <td className="py-2 px-3 text-center font-bold">{p.qtd_cotas}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          R$ {(p.qtd_cotas * bolao.valor_cota).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isPago ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status_pagamento}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Regras e Contingência */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <strong className="text-slate-800 block text-xs">Regras e Política de Contingência:</strong>
            <p>• Regra de Downgrade: {bolao.regra_downgrade === 'diminuir_dezenas' ? 'Reduzir dezenas da aposta principal em caso de inadimplência' : bolao.regra_downgrade === 'devolver_excedente' ? 'Devolver cotas excedentes' : 'Cortar apostas satélites de 6 dezenas mantendo o jogo principal intacto'}.</p>
            <p>• O rateio de prêmios líquidos segue estritamente a proporção de cotas confirmadas até o encerramento das apostas.</p>
          </div>

          {/* Rodapé de Autenticidade */}
          <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-400 space-y-1">
            <p>Este extrato foi gerado eletronicamente com carimbo criptográfico SHA-256 para fins de transparência coletiva e auditoria entre participantes.</p>
            <p className="font-mono text-[10px] text-slate-500">Assinatura Digital: {sha256Hash}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
