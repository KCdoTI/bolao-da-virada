import { Bolao, Participante, Jogo } from '../types/index.js';
import { obterCotasPagas, obterCotasPendentes } from './lotteryEngine.js';

/**
 * Ofusca os dígitos centrais do telefone para privacidade na visualização pública (LGPD)
 * Exemplo: "(11) 98765-4321" -> "(11) 9****-4321"
 */
export function maskPhone(phone: string): string {
  if (!phone) return 'Telefone não informado';
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const ninth = digits.slice(2, 3);
    const end = digits.slice(7);
    return `(${ddd}) ${ninth}****-${end}`;
  }

  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const end = digits.slice(6);
    return `(${ddd}) ****-${end}`;
  }

  if (digits.length > 4) {
    return `${digits.slice(0, 2)}****${digits.slice(-4)}`;
  }

  return '(**) ****-****';
}

/**
 * Monta a URL exclusiva do participante (#cota-<slug>.<token_acesso>).
 * Só recorre ao link público geral (#b-<slug>) se o registro não tiver token_acesso.
 */
export function buildParticipantPortalUrl(
  baseUrl: string,
  bolao: Pick<Bolao, 'hash_slug'>,
  participante?: Pick<Participante, 'token_acesso'> | null
): string {
  const cleanBase = (baseUrl || '').replace(/\/+$/, '');
  if (participante?.token_acesso) {
    return `${cleanBase}/#cota-${bolao.hash_slug}.${participante.token_acesso}`;
  }
  return `${cleanBase}/#b-${bolao.hash_slug}`;
}

/**
 * Monta mensagem estruturada com emojis para envio no WhatsApp (grupo)
 */
export function buildWhatsAppShareMessage(
  bolao: Bolao,
  participantes: Participante[],
  jogos: Jogo[],
  publicUrl: string
): string {
  const cotasPagas = participantes.reduce((acc, p) => acc + obterCotasPagas(p), 0);
  const totalCotas = participantes.reduce((acc, p) => acc + p.qtd_cotas, 0);

  const dataFmt = new Date(bolao.data_limite).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFmt = new Date(bolao.data_limite).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `*${bolao.nome.toUpperCase()}*
Modalidade: ${bolao.modalidade} (Concurso #${bolao.concurso_numero})

• Valor da Cota: R$ ${bolao.valor_cota.toFixed(2)}
• Prazo Limite de Pagamento: ${dataFmt} às ${horaFmt}

[Status do Grupo]
• Cotas confirmadas: ${cotasPagas}/${totalCotas} (${totalCotas > 0 ? Math.round((cotasPagas / totalCotas) * 100) : 0}%)
• Jogos registrados: ${jogos.length} aposta(s)

Para entrar no bolão, ver as regras e gerar seu QR Code PIX (ou se já estiver inscrito, use o seu link individual enviado no privado):
${publicUrl}`;
}

/**
 * Monta mensagem de notificação de premiação individual via WhatsApp
 */
export function buildWhatsAppPayoutMessage(
  nome: string,
  bolaoNome: string,
  totalPremioBolao: number,
  cotasPagas: number,
  valorAReceber: number,
  chavePixOrganizador: string
): string {
  return `*DEMONSTRATIVO DE RATEIO — ${bolaoNome.toUpperCase()}*
Participante: ${nome}

O bolão obteve premiação calculada no concurso com valor total de R$ ${totalPremioBolao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.

[Demonstrativo Individual]
• Cotas pagas vinculadas: ${cotasPagas}
• Valor total a receber: R$ ${valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Favor confirmar sua chave PIX com o organizador (${chavePixOrganizador}) para efetivação do repasse.`;
}

/**
 * Monta mensagem coletiva para o grupo do WhatsApp alertando participantes pendentes
 */
export function buildWhatsAppReminderGroupMessage(
  bolao: Bolao,
  participantesPendentes: Participante[],
  publicUrl: string
): string {
  const cotasPendentes = participantesPendentes.reduce(
    (acc, p) => acc + obterCotasPendentes(p),
    0
  );
  const valorTotalPendente = cotasPendentes * bolao.valor_cota;

  const dataFmt = new Date(bolao.data_limite).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFmt = new Date(bolao.data_limite).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `*LEMBRETE DO BOLÃO — ${bolao.nome.toUpperCase()}*
Modalidade: ${bolao.modalidade} (Concurso #${bolao.concurso_numero})

Atenção participantes! Ainda temos cotas pendentes para fechar o caixa antes do prazo limite.

[Cotas Pendentes de Confirmação]
• Participantes pendentes: ${participantesPendentes.length}
• Cotas a confirmar: ${cotasPendentes} cota(s) (Total: R$ ${valorTotalPendente.toFixed(2)})
• Prazo Limite: ${dataFmt} às ${horaFmt}
• Valor por cota: R$ ${bolao.valor_cota.toFixed(2)}

👉 Quem já está na lista: acesse o *seu link individual* enviado no privado para aceitar as regras, gerar o QR Code PIX com o valor exato e clicar em *"Já fiz o PIX"*.

Link geral de informações do bolão:
${publicUrl}`;
}

/**
 * Monta mensagem individual e personalizada para cobrança direta do participante
 * (SEMPRE recebe o link exclusivo #cota-<slug>.<token_acesso> da pessoa)
 */
export function buildWhatsAppIndividualReminderMessage(
  participante: Participante,
  bolao: Bolao,
  participantPersonalUrl: string
): string {
  const cotasJaPagas = obterCotasPagas(participante);
  const cotasFaltantes = obterCotasPendentes(participante);
  const cotasACobrar = cotasFaltantes > 0 ? cotasFaltantes : participante.qtd_cotas;
  const valorACobrar = cotasACobrar * bolao.valor_cota;
  const totalReservado = participante.qtd_cotas * bolao.valor_cota;

  const dataFmt = new Date(bolao.data_limite).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFmt = new Date(bolao.data_limite).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (cotasJaPagas > 0 && cotasFaltantes > 0) {
    return `Olá ${participante.nome}! Tudo bem?

Atualizamos sua participação no *${bolao.nome}* (${bolao.modalidade} · Concurso #${bolao.concurso_numero}):

• Total reservado agora: ${participante.qtd_cotas} cotas (R$ ${totalReservado.toFixed(2)})
• Já confirmado como pago: ${cotasJaPagas} ${cotasJaPagas === 1 ? 'cota' : 'cotas'} (R$ ${(cotasJaPagas * bolao.valor_cota).toFixed(2)}) ✅
• *Diferença a pagar (+${cotasFaltantes} ${cotasFaltantes === 1 ? 'cota nova' : 'cotas novas'}): R$ ${valorACobrar.toFixed(2)}*
• Prazo limite: ${dataFmt} às ${horaFmt}

Acesse seu link exclusivo abaixo — o *QR Code PIX* já está calculado apenas com a diferença de *R$ ${valorACobrar.toFixed(2)}*:

🔗 *Seu link individual (não compartilhe):*
${participantPersonalUrl}`;
  }

  const etapaInstrucao = participante.aceite_em
    ? `Seu aceite já está registrado! Acesse seu link exclusivo abaixo para copiar o *QR Code PIX* no valor exato e clicar em *"Já fiz o PIX"*.`
    : `Acesse seu *link exclusivo* abaixo para:\n1️⃣ Ver e aceitar as regras do bolão;\n2️⃣ Liberar o *QR Code PIX / Copia e Cola* já com o valor exato;\n3️⃣ Acompanhar os jogos e comprovantes após a confirmação do pagamento.`;

  return `Olá ${participante.nome}! Tudo bem?

Passando para lembrar da sua participação no *${bolao.nome}* (${bolao.modalidade} · Concurso #${bolao.concurso_numero}):

• Suas cotas reservadas: ${participante.qtd_cotas} ${participante.qtd_cotas === 1 ? 'cota' : 'cotas'}
• Valor total: R$ ${valorACobrar.toFixed(2)}
• Prazo limite: ${dataFmt} às ${horaFmt}

${etapaInstrucao}

🔗 *Seu link individual (não compartilhe):*
${participantPersonalUrl}`;
}

/**
 * Monta mensagem individual para o cotista com seu link exclusivo
 */
export function buildWhatsAppIndividualParticipantLinkMessage(
  participante: Participante,
  bolao: Bolao,
  participantPersonalUrl: string
): string {
  const cotasJaPagas = obterCotasPagas(participante);
  const cotasFaltantes = obterCotasPendentes(participante);
  const totalDevido = participante.qtd_cotas * bolao.valor_cota;
  const isTotalmentePago = cotasFaltantes === 0 && cotasJaPagas > 0;

  const resumoFinanceiro =
    cotasJaPagas > 0 && cotasFaltantes > 0
      ? `• Suas Cotas: ${participante.qtd_cotas} no total (${cotasJaPagas} já paga(s) ✅ · falta pagar +${cotasFaltantes} = *R$ ${(cotasFaltantes * bolao.valor_cota).toFixed(2)}*)`
      : `• Suas Cotas: ${participante.qtd_cotas} cota(s) — R$ ${totalDevido.toFixed(2)}`;

  const statusTexto = isTotalmentePago
    ? '✅ Confirmado e Pago (jogos e comprovantes liberados!)'
    : cotasJaPagas > 0
      ? `⏳ Falta confirmar a diferença de +${cotasFaltantes} cota(s) (R$ ${(cotasFaltantes * bolao.valor_cota).toFixed(2)})`
      : participante.aceite_em
        ? '⏳ Regras aceitas · Aguardando PIX'
        : '1️⃣ Aguardando aceite das regras para liberar o QR Code PIX';

  return `Olá ${participante.nome}! Aqui está o seu *link individual exclusivo* do *${bolao.nome}* (${bolao.modalidade} · Concurso #${bolao.concurso_numero}):

${resumoFinanceiro}
• Status Atual: ${statusTexto}

🔗 *Acesse seu painel exclusivo (não compartilhe):*
${participantPersonalUrl}`;
}

/**
 * Cria URL para o cotista enviar comprovante via WhatsApp diretamente ao organizador
 */
export function buildWhatsAppProofSubmissionUrl(
  organizadorTelefone: string,
  participanteNome: string,
  bolaoNome: string,
  qtdCotas: number,
  valorTotal: number
): string {
  const digits = (organizadorTelefone || '').replace(/\D/g, '');
  const cleanPhone = digits.startsWith('55') ? digits : digits ? `55${digits}` : '';
  const text = `Olá! Sou ${participanteNome}. Acabei de realizar o PIX de R$ ${valorTotal.toFixed(2)} referente a ${qtdCotas} cota(s) do ${bolaoNome}. Segue o comprovante em anexo para validação!`;
  if (!cleanPhone) {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Gera um manifesto canônico ordenado do bolão para conferência criptográfica
 */
export function generateCanonicalManifest(
  bolao: Bolao,
  participantes: Participante[],
  jogos: Jogo[]
): string {
  const cotasPagas = participantes.reduce((acc, p) => acc + obterCotasPagas(p), 0);

  const jogosOrdenados = [...jogos]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((j) => ({
      id: j.id,
      tipo: j.tipo_jogo || 'normal',
      modalidade:
        j.tipo_jogo === 'troco' && j.modalidade_especifica
          ? j.modalidade_especifica
          : bolao.modalidade,
      concurso:
        j.tipo_jogo === 'troco' && j.concurso_especifico
          ? j.concurso_especifico
          : bolao.concurso_numero,
      dezenas: [...j.dezenas].sort((x, y) => x - y),
      codigo: j.codigo_bilhete || '',
      comprovante: j.foto_sha256 || j.foto_url || '',
    }));

  const participantesConfirmados = participantes
    .filter((p) => obterCotasPagas(p) > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((p) => ({
      nome: p.nome,
      cotas: obterCotasPagas(p),
    }));

  return JSON.stringify({
    versao_manifesto: 2,
    regras: bolao.regras || [],
    fechado_em: bolao.fechado_em || null,
    resultado: bolao.resultado || null,
    resultados_extras: bolao.resultados_extras || [],
    bolao_id: bolao.id,
    concurso: bolao.concurso_numero,
    modalidade: bolao.modalidade,
    valor_cota: bolao.valor_cota,
    data_limite: bolao.data_limite,
    total_cotas_pagas: cotasPagas,
    jogos: jogosOrdenados,
    participantes_pagos: participantesConfirmados,
  });
}

/**
 * Calcula o hash SHA-256 de um texto usando Web Crypto API (com fallback universal)
 */
export async function calculateSha256(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('SHA-256 indisponível. Abra o aplicativo por HTTPS ou localhost.');
}

/**
 * Cria o link direto para abertura do WhatsApp web ou app
 */
export function buildWhatsAppDirectUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
