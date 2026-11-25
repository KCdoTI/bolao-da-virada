import QRCode from 'qrcode';
import type { TipoChavePix } from '../types/index.js';

function cleanAscii(input: string, maxLen: number, fallback: string): string {
  const normalized = (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return (normalized || fallback).slice(0, maxLen);
}

function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Normaliza a chave PIX para o padrão exigido pelo DICT / BR Code do Banco Central.
 */
export function normalizePixKey(rawKey: string, tipo?: TipoChavePix): string {
  const trimmed = rawKey.trim();
  if (!trimmed) return '';

  // E-mail
  if (tipo === 'email' || trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  // Chave aleatória UUID (EVP)
  if (
    tipo === 'aleatoria' ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
  ) {
    return trimmed.toLowerCase();
  }

  const digits = trimmed.replace(/\D/g, '');

  // Telefone explícito ou com +55 / parênteses de DDD
  if (
    tipo === 'telefone' ||
    trimmed.startsWith('+') ||
    /^\(\d{2}\)\s*9?\d{4}/.test(trimmed)
  ) {
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      return `+${digits}`;
    }
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
  }

  // CPF (11 dígitos) ou CNPJ (14 dígitos)
  if (digits.length === 11 || digits.length === 14) {
    return digits;
  }

  return trimmed;
}

/**
 * Calcula CRC16-CCITT (0xFFFF, polinômio 0x1021) exigido pelo padrão BR Code PIX.
 */
export function calcularCrc16Pix(payloadSemCrc: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payloadSemCrc.length; i++) {
    crc ^= payloadSemCrc.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Monta o código PIX Copia e Cola (BR Code EMVCo estático) com chave, recebedor e valor.
 */
export function gerarPayloadPixEstatico(params: {
  chavePix: string;
  tipoChave?: TipoChavePix;
  nomeRecebedor?: string;
  cidadeRecebedor?: string;
  valor?: number;
  txid?: string;
}): string {
  const chave = normalizePixKey(params.chavePix, params.tipoChave);
  if (!chave) throw new Error('Chave PIX não configurada pelo organizador.');

  const gui = tlv('00', 'br.gov.bcb.pix');
  const keyField = tlv('01', chave);
  const merchantAccountInfo = tlv('26', `${gui}${keyField}`);

  const merchantCategoryCode = tlv('52', '0000');
  const transactionCurrency = tlv('53', '986'); // BRL
  const amountField =
    params.valor && params.valor > 0
      ? tlv('54', params.valor.toFixed(2))
      : '';
  const countryCode = tlv('58', 'BR');
  const merchantName = tlv(
    '59',
    cleanAscii(params.nomeRecebedor || 'ORGANIZADOR BOLAO', 25, 'ORGANIZADOR BOLAO'),
  );
  const merchantCity = tlv(
    '60',
    cleanAscii(params.cidadeRecebedor || 'BRASILIA', 15, 'BRASILIA'),
  );

  const rawTxid = (params.txid || '***').replace(/[^A-Za-z0-9*]/g, '').slice(0, 25) || '***';
  const additionalDataField = tlv('62', tlv('05', rawTxid));

  const semCrc =
    tlv('00', '01') +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    amountField +
    countryCode +
    merchantName +
    merchantCity +
    additionalDataField +
    '6304';

  const crc = calcularCrc16Pix(semCrc);
  return `${semCrc}${crc}`;
}

/**
 * Gera um SVG nítido do QR Code PIX localmente (sem enviar a chave a APIs de terceiros).
 */
export async function gerarQrCodePixSvg(payloadPix: string): Promise<string> {
  return QRCode.toString(payloadPix, {
    type: 'svg',
    margin: 1,
    width: 240,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
