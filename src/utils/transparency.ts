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

  return `🍀 *${bolao.nome.toUpperCase()}* 🍀
Modalidade: *${bolao.modalidade}* (Concurso #${bolao.concurso_numero})

💰 *Valor da Cota:* R$ ${bolao.valor_cota.toFixed(2)}
📅 *Data Limite de Pagamento:* ${dataFmt} às ${horaFmt}
🔑 *Chave PIX do Organizador:* ${bolao.chave_pix_organizador}

📊 *Status do Bolão:*
• *${cotasPagas}/${totalCotas}* cotas confirmadas (${totalCotas > 0 ? Math.round((cotasPagas / totalCotas) * 100) : 0}%)
• *${jogos.length}* jogos registrados com comprovantes

🔍 *Acompanhe pelo Link de Transparência (sem login):*
${publicUrl}

Comprovantes oficiais autenticados e conferência ao vivo após o sorteio! 🥂✨`;
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
  return `🎉 *PARABÉNS, ${nome.toUpperCase()}! NOSSO BOLÃO FOI PREMIADO!* 🥂🍀

No *${bolaoNome}*, o total conquistado pelo grupo foi de *R$ ${totalPremioBolao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*!

📊 *Seu Rateio Financeiro:*
• Cotas pagas: *${cotasPagas}*
• Valor total a receber: *R$ ${valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*

Favor confirmar sua chave PIX com o organizador para a transferência do seu prêmio.
Parabéns a todos os cotistas! 💰🚀`;
}
