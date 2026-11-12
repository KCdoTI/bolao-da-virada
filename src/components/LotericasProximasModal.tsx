import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  Navigation,
  Flame,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Calendar,
  Building,
  Phone,
} from 'lucide-react';

interface LotericaInfo {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  distanciaKm: number;
  telefone: string;
  terminalCaixa: string;
  destaquePeQuente?: string;
  horarioSemana: string;
  horarioSabado: string;
  horarioDomingo: string;
}

const LOTERICAS_MOCK: LotericaInfo[] = [
  {
    id: 'lot-1',
    nome: 'Lotérica Trevo de Ouro — Paulista',
    endereco: 'Av. Paulista, 1374 - Bela Vista',
    cidade: 'São Paulo - SP',
    distanciaKm: 1.2,
    telefone: '(11) 3284-9900',
    terminalCaixa: '04.912.842',
    destaquePeQuente: '🔥 Premiou Quina no Concurso #2798 (R$ 78.420) e 1 Sena histórica',
    horarioSemana: '08:30 – 18:00',
    horarioSabado: '08:00 – 12:00',
    horarioDomingo: 'Fechado',
  },
  {
    id: 'lot-2',
    nome: 'Lotérica Ouro da Sorte — Centro',
    endereco: 'Rua Direita, 250 - Sé',
    cidade: 'São Paulo - SP',
    distanciaKm: 2.5,
    telefone: '(11) 3105-1122',
    terminalCaixa: '02.441.711',
    destaquePeQuente: '🏆 Mais de 12 quadras e 2 quinas registradas no último ano',
    horarioSemana: '08:30 – 18:00',
    horarioSabado: '08:00 – 12:00',
    horarioDomingo: 'Fechado',
  },
  {
    id: 'lot-3',
    nome: 'Lotérica Estrela da Sorte — Pinheiros',
    endereco: 'Rua Teodoro Sampaio, 1850 - Pinheiros',
    cidade: 'São Paulo - SP',
    distanciaKm: 3.8,
    telefone: '(11) 3812-4455',
    terminalCaixa: '01.884.229',
    destaquePeQuente: '🔥 Lotérica Pé-Quente: 1x Sena da Virada e 3x Quinas',
    horarioSemana: '08:30 – 18:00',
    horarioSabado: '08:00 – 12:00',
    horarioDomingo: 'Fechado',
  },
  {
    id: 'lot-4',
    nome: 'Lotérica Boa Sorte — Moema',
    endereco: 'Av. Ibirapuera, 2907 - Moema',
    cidade: 'São Paulo - SP',
    distanciaKm: 4.6,
    telefone: '(11) 5051-7890',
    terminalCaixa: '06.129.840',
    destaquePeQuente: '⭐ Ponto tradicional Caixa com guichê exclusivo para bolões',
    horarioSemana: '08:30 – 18:00',
    horarioSabado: '08:00 – 12:00',
    horarioDomingo: 'Fechado',
  },
];

interface LotericasProximasModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSorteio?: string;
}

export const LotericasProximasModal: React.FC<LotericasProximasModalProps> = ({
  isOpen,
  onClose,
  dataSorteio,
}) => {
  const [cidadeFiltro, setCidadeFiltro] = useState('São Paulo - SP');
  const [geoLocating, setGeoLocating] = useState(false);
  const [statusHoje, setStatusHoje] = useState<{
    aberta: boolean;
    mensagem: string;
    horaEncerramento: string;
  }>({
    aberta: true,
    mensagem: 'Aberta agora para apostas',
    horaEncerramento: '18:00',
  });

  useEffect(() => {
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 = Domingo, 6 = Sábado
    const hora = agora.getHours();
    const minuto = agora.getMinutes();
    const tempoAtualMin = hora * 60 + minuto;

    if (diaSemana === 0) {
      setStatusHoje({
        aberta: false,
        mensagem: 'Fechado aos Domingos e Feriados',
        horaEncerramento: 'Fechado',
      });
    } else if (diaSemana === 6) {
      // Sábado 08:00 às 12:00
      const abre = 8 * 60;
      const fecha = 12 * 60;
      if (tempoAtualMin >= abre && tempoAtualMin < fecha) {
        const restaMin = fecha - tempoAtualMin;
        const h = Math.floor(restaMin / 60);
        const m = restaMin % 60;
        setStatusHoje({
          aberta: true,
          mensagem: `Aberta agora! Fecha às 12:00 (restam ${h}h ${m}m)`,
          horaEncerramento: '12:00',
        });
      } else {
        setStatusHoje({
          aberta: false,
          mensagem: 'Fechado no momento (Sábado funciona das 08:00 às 12:00)',
          horaEncerramento: '12:00',
        });
      }
    } else {
      // Seg-Sex: 08:30 às 18:00
      const abre = 8 * 60 + 30;
      const fecha = 18 * 60;
      if (tempoAtualMin >= abre && tempoAtualMin < fecha) {
        const restaMin = fecha - tempoAtualMin;
        const h = Math.floor(restaMin / 60);
        const m = restaMin % 60;
        setStatusHoje({
          aberta: true,
          mensagem: `Aberta agora! Encerramento de apostas às 18:00 (restam ${h}h ${m}m)`,
          horaEncerramento: '18:00',
        });
      } else if (tempoAtualMin < abre) {
        setStatusHoje({
          aberta: false,
          mensagem: 'Abre hoje às 08:30',
          horaEncerramento: '18:00',
        });
      } else {
        setStatusHoje({
          aberta: false,
          mensagem: 'Fechado hoje (encerrado às 18:00). Abre amanhã às 08:30',
          horaEncerramento: '18:00',
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      setGeoLocating(true);
      navigator.geolocation.getCurrentPosition(
        () => {
          setGeoLocating(false);
          // Simula filtro baseado no CEP/Região
        },
        () => {
          setGeoLocating(false);
        },
        { timeout: 4000 }
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lotéricas Próximas e Horários Oficiais Caixa"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <Building size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Lotéricas Próximas & Horários de Funcionamento
              </h3>
              <p className="text-xs text-slate-400">
                Prazos oficiais da Caixa Econômica Federal e lotéricas pé-quente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Card de Status em Tempo Real */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              statusHoje.aberta
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full shrink-0 ${
                  statusHoje.aberta ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div>
                <strong className="block text-sm font-bold">{statusHoje.mensagem}</strong>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Horário bancário padrão Caixa: Seg a Sex 08:30–18:00 • Sáb 08:00–12:00
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Corte de Apostas
              </span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                {statusHoje.horaEncerramento}
              </span>
            </div>
          </div>

          {/* Grade de Horários Oficiais da Caixa */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
              <Clock size={14} className="text-emerald-500" />
              <span>Tabela Oficial de Horários — Caixa Econômica Federal</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                  Seg a Sex
                </span>
                <strong className="text-emerald-600 dark:text-emerald-400">08:30 – 18:00</strong>
              </div>

              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                  Sábado
                </span>
                <strong className="text-slate-800 dark:text-slate-200">08:00 – 12:00</strong>
              </div>

              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                  Domingo / Feriados
                </span>
                <strong className="text-red-500">Fechado</strong>
              </div>

              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                  Autoatendimento
                </span>
                <strong className="text-slate-800 dark:text-slate-200">Até 19:00</strong>
              </div>
            </div>
          </div>

          {/* Dica de Segurança do Organizador */}
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-400/30 rounded-xl text-blue-900 dark:text-blue-300 text-[11px] leading-relaxed">
            <strong>Dica de Ouro para o Organizador:</strong> Em dias de concurso com prêmio acumulado, as filas de lotérica aumentam a partir das 16:30. Recomendamos encerrar os pagamentos e registrar os bilhetes até às <strong>16:00</strong> para garantir que os terminais não travem antes das 18h.
          </div>

          {/* Filtro de Região e Lotéricas Pé-Quente */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-500" />
                <span>Lotéricas Credenciadas & Pé-Quente Próximas</span>
              </span>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={geoLocating}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Navigation size={12} className={geoLocating ? 'animate-spin' : ''} />
                <span>{geoLocating ? 'Localizando...' : 'Atualizar Perto de Mim'}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {LOTERICAS_MOCK.map((lot) => (
                <div
                  key={lot.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{lot.nome}</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono px-2 py-0.5 rounded-md">
                          ~{lot.distanciaKm} km
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {lot.endereco} • {lot.cidade}
                      </p>
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${lot.nome} ${lot.endereco}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition self-start sm:self-center cursor-pointer shrink-0"
                    >
                      <Navigation size={12} />
                      <span>Abrir no Maps</span>
                    </a>
                  </div>

                  {lot.destaquePeQuente && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                      <Flame size={14} className="text-amber-500 shrink-0" />
                      <span>{lot.destaquePeQuente}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <span>Telefone: {lot.telefone}</span>
                    <span className="font-mono">Terminal Caixa: {lot.terminalCaixa}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
