import { getModalidadeInfo } from '../constants/lotteryCatalog.js';
import { validarDezenas } from './validation.js';
export interface ExtractedGameCandidate {
  rawLine: string;
  dezenas: number[];
  confianca: 'alta' | 'media';
  descricao: string;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo da foto.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensiona, corrige rotação opcional (0/90/180/270) e comprime fotos grandes
 * da câmera do celular (ex.: 4 a 15 MB) para JPEG nítido abaixo de 1,8 MB,
 * garantindo armazenamento seguro no servidor sem estourar o limite de 2 MB.
 */
export async function prepareReceiptImage(
  source: File | string,
  rotationDeg = 0,
): Promise<string> {
  const rawUrl = typeof source === 'string' ? source : await readFileAsDataUrl(source);
  const img = await loadImageElement(rawUrl);

  const normRot = ((rotationDeg % 360) + 360) % 360;
  const swapSides = normRot === 90 || normRot === 270;

  const renderAt = (maxDim: number, quality: number): string => {
    let w = img.width;
    let h = img.height;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = swapSides ? h : w;
    canvas.height = swapSides ? w : h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return rawUrl;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((normRot * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', quality);
  };

  let jpeg = renderAt(1600, 0.85);
  // Se ainda ficar acima de ~1.8 MB em bytes reais, reduz um degrau
  if (jpeg.length * 0.75 > 1.8 * 1024 * 1024) {
    jpeg = renderAt(1280, 0.74);
  }
  return jpeg;
}

/**
 * Gera cópia em alto contraste / binarizada a partir de um DataURL para leitura OCR.
 */
export async function preprocessDataUrlForOcr(dataUrl: string): Promise<string> {
  const img = await loadImageElement(dataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  const maxDim = 1200;
  let w = img.width;
  let h = img.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const threshold = avg > 135 ? 255 : 0;
    data[i] = threshold;
    data[i + 1] = threshold;
    data[i + 2] = threshold;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Compatibilidade com chamadas diretas por File
 */
export async function preprocessTicketImage(file: File): Promise<string> {
  const prepared = await prepareReceiptImage(file, 0);
  return preprocessDataUrlForOcr(prepared);
}

/**
 * Parser focado no layout de comprovantes térmicos da Caixa:
 * 1. Remove linhas de cabeçalho, datas, valores e identificadores.
 * 2. Trata substituições comuns de OCR em fontes térmicas (0/O, 1/I, 5/S, 8/B).
 * 3. Detecta automaticamente ou via parâmetro a modalidade:
 *    - Lotofácil (1 a 25; 15 a 20 dezenas)
 *    - Quina (1 a 80; 5 a 15 dezenas)
 *    - Dupla Sena (1 a 50; 6 a 15 dezenas)
 *    - Mega-Sena (1 a 60; 6 a 15 dezenas)
 */
export function parseCaixaTicketText(
  ocrText: string,
  modalidadePreferida?: string
): ExtractedGameCandidate[] {
  if (!ocrText) return [];

  const upper = ocrText.toUpperCase();
  const inferred = /LOTOF[ÁA]CIL/.test(upper) ? 'Lotofácil' : /QUINA/.test(upper) ? 'Quina' : /DUPLA/.test(upper) ? 'Dupla Sena' : 'Mega-Sena';
  const modalidade = modalidadePreferida || inferred;
  const info = getModalidadeInfo(modalidade);
  const candidates: ExtractedGameCandidate[] = [];
  let pending: number[] = [];
  let raw: string[] = [];
  const flush = () => {
    try {
      validarDezenas(pending, modalidade);
      candidates.push({ rawLine: raw.join('\n'), dezenas: [...pending].sort((a,b)=>a-b), confianca: raw.length === 1 ? 'alta' : 'media', descricao: `Possível jogo de ${modalidade}: confira no original.` });
    } catch { /* Ambiguous or incomplete blocks are deliberately not guessed. */ }
    pending=[];raw=[];
  };
  for (const line of ocrText.split(/\r?\n/)) {
    const trimmed=line.trim().toUpperCase();
    if (!trimmed || /CONCURSO|VALOR|DATA|HORA|CAIXA|LOTER|TERMINAL|LOCAL|AGENCIA|SEGURAN|SERIE|APURAC|AUTENTIC|CONTROLE|BARRAS|FEDERAL|ECONOM|BILHETE|R\$|\d[/:.]\d/.test(trimmed)) { flush(); continue; }
    const prefix=/^(?:JOGO\s*\d+\s*[:\-]?|[A-Z]\s*[-:])\s*/;
    if(prefix.test(trimmed))flush();
    const numbers=trimmed.replace(prefix,'').replace(/[O]/g,'0').replace(/[I|]/g,'1');
    if(!numbers)continue;
    if(!/^(?:\d{1,2})(?:[\s,;\-]+\d{1,2})*$/.test(numbers)){flush();continue;}
    const values=numbers.split(/[\s,;\-]+/).map(Number);
    if(values.some(n=>n<1||n>info.universoNumeros)){flush();continue;}
    if(values.length>=info.minimoDezenas){flush();pending=values;raw=[line];flush();}
    else { pending.push(...values);raw.push(line); }
  }
  flush();

  return candidates;
}

/**
 * Exemplos pré-carregados de bilhetes para teste imediato de OCR e validação
 */
export const SAMPLE_TICKETS = [
  {
    nome: 'Bilhete 01 - Mega da Virada (6 dezenas)',
    rawText: `
CAIXA ECONOMICA FEDERAL
COMPROVANTE DE APOSTA
LOTERICA OURO DA SORTE
MEGA DA VIRADA - CONCURSO 2810
DATA: 31/12/2026 14:22:10
JOGO 01
05  10  18  34  42  59
VALOR DA APOSTA: R$ 6,00
CONTROLE: 8492-1049-5832-1920
TERMINAL: 04.912.842-1
    `.trim(),
    dezenasEsperadas: [5, 10, 18, 34, 42, 59],
  },
  {
    nome: 'Bilhete 02 - Aposta Especial (7 dezenas)',
    rawText: `
CAIXA ECONOMICA FEDERAL
LOTERICA TREVO VERDE
CONCURSO 2810 - MEGA DA VIRADA
DATA APURACAO 31/12/2026
A - 03  10  18  34  42  55  60
VALOR R$ 42,00
AUTENTICACAO 9921-4820-1102
    `.trim(),
    dezenasEsperadas: [3, 10, 18, 34, 42, 55, 60],
  },
  {
    nome: 'Bilhete 03 - Lotofácil da Independência (15 dezenas)',
    rawText: `
CAIXA ECONOMICA FEDERAL
LOTERIAS CAIXA - LOTOFACIL
CONCURSO 3200 - INDEPENDENCIA
01  03  05  07  09
11  13  15  17  19
21  22  23  24  25
VALOR DA APOSTA R$ 3,50
CONTROLE: 1204-9843-1123-5590
    `.trim(),
    dezenasEsperadas: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 22, 23, 24, 25],
  },
  {
    nome: 'Bilhete 04 - Quina de São João (5 dezenas)',
    rawText: `
CAIXA ECONOMICA FEDERAL
LOTERICA PRACINHA DA SORTE
QUINA DE SAO JOAO - CONCURSO 6500
JOGO 01: 12  28  45  67  79
VALOR DA APOSTA: R$ 3,00
CONTROLE: 5541-8891-3321-1200
    `.trim(),
    dezenasEsperadas: [12, 28, 45, 67, 79],
  }
];
