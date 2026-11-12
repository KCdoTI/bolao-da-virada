import React, { useState } from 'react';
import {
  X,
  Settings,
  PlusCircle,
  Check,
  ShieldCheck,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Bolao, RegraDowngrade, TipoChavePix } from '../types';

interface ConfigurarBolaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  bolaoAtual: Bolao;
  onSalvarBolao: (bolaoConfigurado: Bolao, resetarParticipantesEJogos: boolean) => void;
}

export const ConfigurarBolaoModal: React.FC<ConfigurarBolaoModalProps> = ({
  isOpen,
  onClose,
  bolaoAtual,
  onSalvarBolao,
}) => {
  const [nome, setNome] = useState(bolaoAtual.nome || 'Piloto Mega-Sena #2810');
  const [modalidade, setModalidade] = useState(bolaoAtual.modalidade || 'Mega-Sena');
  const [concursoNumero, setConcursoNumero] = useState(bolaoAtual.concurso_numero || 2810);
  const [valorCota, setValorCota] = useState<number>(bolaoAtual.valor_cota || 12.0);
  const [dataLimite, setDataLimite] = useState(
    bolaoAtual.data_limite ? bolaoAtual.data_limite.slice(0, 16) : '2026-11-19T17:00'
  );
  const [chavePix, setChavePix] = useState(bolaoAtual.chave_pix_organizador || '');
  const [tipoChavePix, setTipoChavePix] = useState<TipoChavePix>(
    bolaoAtual.tipo_chave_pix || 'email'
  );
  const [nomeOrganizador, setNomeOrganizador] = useState(
    bolaoAtual.nome_organizador || 'Kelvin Castro'
  );
  const [regraDowngrade, setRegraDowngrade] = useState<RegraDowngrade>(
    bolaoAtual.regra_downgrade || 'cortar_satelites'
  );
  const [horarioLoterica, setHorarioLoterica] = useState(
    bolaoAtual.horario_limite_loterica || '18:00'
  );

  // Modo: apenas atualizar parâmetros ou criar bolão do zero para o piloto
  const [iniciarDoZero, setIniciarDoZero] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      alert('Informe um nome para o bolão.');
      return;
    }
    if (!chavePix.trim()) {
      alert('Informe a sua chave PIX para que os cotistas façam os depósitos diretamente a você.');
      return;
    }
    if (valorCota <= 0) {
      alert('O valor por cota deve ser maior que zero.');
      return;
    }

    const novoHash = iniciarDoZero
      ? `piloto-${Math.random().toString(36).substring(2, 7)}`
      : bolaoAtual.hash_slug;

    const novoAdminToken = bolaoAtual.admin_token || `adm_${Math.random().toString(36).substring(2, 9)}`;

    const atualizado: Bolao = {
      ...bolaoAtual,
      id: iniciarDoZero ? `bolao-${Date.now()}` : bolaoAtual.id,
      nome,
      modalidade,
      concurso_numero: Number(concursoNumero),
      valor_cota: Number(valorCota),
      data_limite: dataLimite,
      chave_pix_organizador: chavePix,
      tipo_chave_pix: tipoChavePix,
      nome_organizador: nomeOrganizador,
      regra_downgrade: regraDowngrade,
      horario_limite_loterica: horarioLoterica,
      hash_slug: novoHash,
      admin_token: novoAdminToken,
      status: 'aberto',
      dezenas_sorteadas: iniciarDoZero ? [] : bolaoAtual.dezenas_sorteadas,
    };

    onSalvarBolao(atualizado, iniciarDoZero);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configurar ou Criar Novo Bolão"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Configurar Parâmetros do Bolão
              </h3>
              <p className="text-xs text-slate-400">
                Personalize cotas, chave PIX pessoal direta e regras de contingência
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

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Nome e Modalidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 block">
                Nome do Bolão:
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Piloto Mega-Sena #2810 - Grupo Amigos"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 block">
                Modalidade:
              </label>
              <select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Mega-Sena">Mega-Sena</option>
                <option value="Mega da Virada">Mega da Virada</option>
                <option value="Quina">Quina</option>
                <option value="Lotofácil">Lotofácil</option>
              </select>
            </div>
          </div>

          {/* Concurso e Valor da Cota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 block">
                Número do Concurso Caixa:
              </label>
              <input
                type="number"
                required
                value={concursoNumero}
                onChange={(e) => setConcursoNumero(Number(e.target.value))}
                placeholder="Ex: 2810"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 block">
                Valor por Cota (R$):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.50"
                  min="1"
                  required
                  value={valorCota}
                  onChange={(e) => setValorCota(parseFloat(e.target.value) || 0)}
                  placeholder="12.00"
                  className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-400">
                Sugestão para piloto: R$ 12,00 (permite fechar 1 desdobramento de 7 dezenas com 8 cotistas)
              </span>
            </div>
          </div>

          {/* Dados do Organizador e Chave PIX Pessoal */}
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
              <CreditCard size={15} />
              <span>PIX Direto para o Organizador (Sem custódia de terceiros)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Tipo de Chave:
                </label>
                <select
                  value={tipoChavePix}
                  onChange={(e) => setTipoChavePix(e.target.value as TipoChavePix)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="cpf">CPF</option>
                  <option value="celular">Celular / WhatsApp</option>
                  <option value="email">E-mail</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Chave PIX Cadastrada:
                </label>
                <input
                  type="text"
                  required
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  placeholder="sua-chave@pix.com.br ou (11) 98765-4321"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                Nome do Titular da Conta PIX:
              </label>
              <input
                type="text"
                required
                value={nomeOrganizador}
                onChange={(e) => setNomeOrganizador(e.target.value)}
                placeholder="Ex: Kelvin Castro"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Os cotistas verão este nome para conferir o destinatário na tela do banco.
              </span>
            </div>
          </div>

          {/* Horários e Prazos da Lotérica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 block">
                Data/Hora Limite de Pagamento:
              </label>
              <input
                type="datetime-local"
                required
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 block">
                Horário Limite da Lotérica:
              </label>
              <select
                value={horarioLoterica}
                onChange={(e) => setHorarioLoterica(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="18:00">18:00 (Padrão Dias Úteis Seg-Sex)</option>
                <option value="17:00">17:00 (Segurança Recomendada)</option>
                <option value="12:00">12:00 (Sábados)</option>
                <option value="19:00">19:00 (Canais Eletrônicos Caixa)</option>
              </select>
            </div>
          </div>

          {/* Regra de Downgrade Automático */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-slate-700 dark:text-slate-200 block">
              Regra de Downgrade (se alguém não pagar até o prazo limite):
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                <input
                  type="radio"
                  name="regraDowngrade"
                  value="cortar_satelites"
                  checked={regraDowngrade === 'cortar_satelites'}
                  onChange={() => setRegraDowngrade('cortar_satelites')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <strong className="block text-slate-800 dark:text-slate-200">
                    Cortar Apostas Satélites de 6 Dezenas (Recomendado)
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Preserva intacta a aposta principal desdobrada de 7 ou 8 dezenas, reduzindo apenas os jogos complementares de menor custo.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                <input
                  type="radio"
                  name="regraDowngrade"
                  value="diminuir_dezenas"
                  checked={regraDowngrade === 'diminuir_dezenas'}
                  onChange={() => setRegraDowngrade('diminuir_dezenas')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <strong className="block text-slate-800 dark:text-slate-200">
                    Reduzir Dezenas da Aposta Principal
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Se o montante cair, reduz o tamanho do desdobramento (ex: de 8 para 7 dezenas), preservando os primeiros números escolhidos.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Opção para Iniciar do Zero (Piloto) */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-800 dark:text-amber-300">
              <input
                type="checkbox"
                checked={iniciarDoZero}
                onChange={(e) => setIniciarDoZero(e.target.checked)}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
              />
              <span>Iniciar bolão em branco para o teste piloto (limpar dados anteriores)</span>
            </label>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-6">
              Marque esta opção para cadastrar o grupo pequeno real de 7 a 8 pessoas sem misturar com os dados de demonstração.
            </p>
          </div>

          {/* Ações */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={15} />
              <span>Salvar Parâmetros</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
