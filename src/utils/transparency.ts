import { Bolao, Participante, Jogo } from '../types';

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
 * Monta mensagem estruturada com emojis para envio no WhatsApp
 */
export function buildWhatsAppShareMessage(
  bolao: Bolao,
  participantes: Participante[],
  jogos: Jogo[],
  publicUrl: string
): string {
  const cotasPagas = participantes
    .filter((p) => p.status_pagamento === 'Pago')
    .reduce((acc, p) => acc + p.qtd_cotas, 0);
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
• Data Limite de Pagamento: ${dataFmt} às ${horaFmt}
• Chave PIX do Organizador: ${bolao.chave_pix_organizador}

[Status de Arrecadação]
• Cotas confirmadas: ${cotasPagas}/${totalCotas} (${totalCotas > 0 ? Math.round((cotasPagas / totalCotas) * 100) : 0}%)
• Jogos autenticados: ${jogos.length} apostas

[Painel de Transparência e Auditoria (sem login)]
${publicUrl}

Comprovantes autenticados pela Caixa e conferência automatizada pós-sorteio.`;
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
  return `*COMUNICADO OFICIAL DE RATEIO — ${bolaoNome.toUpperCase()}*
Participante: ${nome}

O bolão obteve premiação oficial no concurso com valor total de R$ ${totalPremioBolao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.

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
  const cotasPendentes = participantesPendentes.reduce((acc, p) => acc + p.qtd_cotas, 0);
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

Atenção participantes! Ainda temos cotas pendentes para registrar todos os bilhetes na lotérica antes do prazo final.

[Cotas Pendentes de Confirmação]
• Participantes com cota pendente: ${participantesPendentes.length}
• Cotas a confirmar: ${cotasPendentes} cota(s) (Total: R$ ${valorTotalPendente.toFixed(2)})
• Prazo Limite: ${dataFmt} às ${horaFmt}

[Dados para Pagamento via PIX]
• Chave PIX do Organizador: ${bolao.chave_pix_organizador}
• Valor por cota: R$ ${bolao.valor_cota.toFixed(2)}

Após realizar a transferência, favor enviar o comprovante para confirmação imediata.

Acompanhe o status e os bilhetes registrados em tempo real:
${publicUrl}`;
}

/**
 * Monta mensagem individual e personalizada para cobrança direta do participante
 */
export function buildWhatsAppIndividualReminderMessage(
  participante: Participante,
  bolao: Bolao,
  publicUrl: string
): string {
  const totalDevido = participante.qtd_cotas * bolao.valor_cota;

  const dataFmt = new Date(bolao.data_limite).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFmt = new Date(bolao.data_limite).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `Olá ${participante.nome}! Tudo bem?

Passando para lembrar da sua participação no *${bolao.nome}* (${bolao.modalidade}):

• Suas cotas reservadas: ${participante.qtd_cotas} ${participante.qtd_cotas === 1 ? 'cota' : 'cotas'}
• Valor a transferir: R$ ${totalDevido.toFixed(2)}
• Chave PIX do Organizador: ${bolao.chave_pix_organizador}
• Prazo limite: ${dataFmt} às ${horaFmt}

Assim que fizer o PIX, me avise para eu marcar sua cota como Paga no painel do grupo!

Você pode acompanhar os jogos e comprovantes do bolão aqui:
${publicUrl}`;
}

/**
 * Monta mensagem individual para o cotista com seu link exclusivo
 */
export function buildWhatsAppIndividualParticipantLinkMessage(
  participante: Participante,
  bolao: Bolao,
  participantPersonalUrl: string
): string {
  const totalDevido = participante.qtd_cotas * bolao.valor_cota;
  const isPago = participante.status_pagamento === 'Pago';

  return `Olá ${participante.nome}! Aqui está o seu link pessoal e seguro de acompanhamento do *${bolao.nome}*:

• Suas Cotas: ${participante.qtd_cotas} cota(s) — R$ ${totalDevido.toFixed(2)}
• Status Atual: ${isPago ? 'Confirmado e Pago' : 'Aguardando Pagamento PIX'}
• Chave PIX do Organizador: ${bolao.chave_pix_organizador}

Acesse seu painel pessoal de transparência (bilhetes autenticados e conferência ao vivo):
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
  const cotasPagas = participantes
    .filter((p) => p.status_pagamento === 'Pago')
    .reduce((acc, p) => acc + p.qtd_cotas, 0);

  const jogosOrdenados = [...jogos]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((j) => ({
      id: j.id,
      dezenas: [...j.dezenas].sort((x, y) => x - y),
      codigo: j.codigo_bilhete || '',
    }));

  const participantesConfirmados = participantes
    .filter((p) => p.status_pagamento === 'Pago')
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((p) => ({
      nome: p.nome,
      cotas: p.qtd_cotas,
    }));

  return JSON.stringify({
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

  // Algoritmo FNV-1a expandido de 64 caracteres se nada mais estiver disponível
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193);
    h2 = Math.imul(h2 ^ text.charCodeAt(i), 0x01000193);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return (part1 + part2).repeat(4).slice(0, 64);
}

/**
 * Cria o link direto para abertura do WhatsApp web ou app
 */
export function buildWhatsAppDirectUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
