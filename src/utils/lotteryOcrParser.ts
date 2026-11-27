import { getModalidadeInfo } from '../constants/lotteryCatalog.js';
import { validarDezenas } from './validation.js';

export interface ExtractedGameCandidate {
  label?: string;
  rawLine: string;
  dezenas: number[];
  confianca: 'alta' | 'media';
  descricao: string;
}

export interface ExtractedTicketMetadata {
  codigoBilhete?: string;
  concurso?: number;
  combinadaDezenas?: number;
  cotaBolaoCaixa?: string;
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

  let jpeg = renderAt(1800, 0.86);
  if (jpeg.length * 0.75 > 1.8 * 1024 * 1024) {
    jpeg = renderAt(1360, 0.76);
  }
  return jpeg;
}

/**
 * Pré-processamento especializado para recibos térmicos das Loterias Caixa:
 * 1. Usa resolução alta (até 2600px) para preservar os dígitos com zero cortado (Ø);
 * 2. Detecta e recorta automaticamente a área branca do papel (ignorando mão, mesa, painel do carro);
 * 3. Extrai `max(G, B)` (canal azul/ciano) — como a marca d'água "loterias CAIXA" é azul-clara,
 *    ela desaparece no fundo branco enquanto a tinta térmica preta permanece escura;
 * 4. Normaliza iluminação local por imagem integral (corrige sombras de foto tirada à noite/no carro)
 *    e amplia 1.5x para leitura limpa no Tesseract.
 */
export async function preprocessDataUrlForOcr(
  source: File | string,
  rotationDeg = 0,
): Promise<string> {
  const rawUrl = typeof source === 'string' ? source : await readFileAsDataUrl(source);
  const img = await loadImageElement(rawUrl);

  const normRot = ((rotationDeg % 360) + 360) % 360;
  const swapSides = normRot === 90 || normRot === 270;

  const maxDim = 2600;
  let drawW = img.width;
  let drawH = img.height;
  if (drawW > maxDim || drawH > maxDim) {
    if (drawW > drawH) {
      drawH = Math.round((drawH * maxDim) / drawW);
      drawW = maxDim;
    } else {
      drawW = Math.round((drawW * maxDim) / drawH);
      drawH = maxDim;
    }
  }

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = swapSides ? drawH : drawW;
  baseCanvas.height = swapSides ? drawW : drawH;
  const baseCtx = baseCanvas.getContext('2d');
  if (!baseCtx) return rawUrl;

  baseCtx.fillStyle = '#ffffff';
  baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
  baseCtx.save();
  baseCtx.translate(baseCanvas.width / 2, baseCanvas.height / 2);
  baseCtx.rotate((normRot * Math.PI) / 180);
  baseCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  baseCtx.restore();

  const W = baseCanvas.width;
  const H = baseCanvas.height;
  const rgba = baseCtx.getImageData(0, 0, W, H).data;

  // Detecta bounding box do papel térmico claro
  const rowWhite = new Int32Array(H);
  const colWhite = new Int32Array(W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      if (rgba[idx] > 155 && rgba[idx + 1] > 165 && rgba[idx + 2] > 170) {
        rowWhite[y]++;
        colWhite[x]++;
      }
    }
  }

  let minY = 0;
  let maxY = H - 1;
  let minX = 0;
  let maxX = W - 1;

  let foundY = false;
  for (let y = 0; y < H; y++) {
    if (rowWhite[y] > W * 0.18) {
      if (!foundY) {
        minY = y;
        foundY = true;
      }
      maxY = y;
    }
  }
  let foundX = false;
  for (let x = 0; x < W; x++) {
    if (colWhite[x] > H * 0.22) {
      if (!foundX) {
        minX = x;
        foundX = true;
      }
      maxX = x;
    }
  }

  // Garante recorte plausível (ao menos 25% da área)
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  if (!foundX || !foundY || cropW < W * 0.2 || cropH < H * 0.25) {
    minX = 0;
    minY = 0;
    maxX = W - 1;
    maxY = H - 1;
  }

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const gray = new Float32Array(cw * ch);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const idx = ((minY + y) * W + (minX + x)) * 4;
      // Canal máximo entre Verde e Azul apaga a marca d'água azul-clara da Caixa!
      gray[y * cw + x] = Math.max(rgba[idx + 1], rgba[idx + 2]);
    }
  }

  // Imagem integral para normalização adaptativa local de sombra
  const stride = cw + 1;
  const integral = new Float64Array(stride * (ch + 1));
  for (let y = 1; y <= ch; y++) {
    let rowSum = 0;
    for (let x = 1; x <= cw; x++) {
      rowSum += gray[(y - 1) * cw + (x - 1)];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowSum;
    }
  }

  const normCanvas = document.createElement('canvas');
  normCanvas.width = cw;
  normCanvas.height = ch;
  const normCtx = normCanvas.getContext('2d');
  if (!normCtx) return rawUrl;

  const outImg = normCtx.createImageData(cw, ch);
  const outData = outImg.data;
  const rad = Math.max(24, Math.floor(cw / 14));

  for (let y = 0; y < ch; y++) {
    const y0 = Math.max(0, y - rad);
    const y1 = Math.min(ch, y + rad + 1);
    for (let x = 0; x < cw; x++) {
      const x0 = Math.max(0, x - rad);
      const x1 = Math.min(cw, x + rad + 1);
      const area = (y1 - y0) * (x1 - x0);
      const sum =
        integral[y1 * stride + x1] -
        integral[y0 * stride + x1] -
        integral[y1 * stride + x0] +
        integral[y0 * stride + x0];
      const localMean = Math.max(40, sum / area);
      const ratio = gray[y * cw + x] / localMean;
      const v = Math.round(
        Math.min(255, Math.max(0, ((ratio - 0.5) / (0.86 - 0.5)) * 255)),
      );
      const p = (y * cw + x) * 4;
      outData[p] = v;
      outData[p + 1] = v;
      outData[p + 2] = v;
      outData[p + 3] = 255;
    }
  }
  normCtx.putImageData(outImg, 0, 0);

  // Amplia suavemente (até ~1400px de largura) para facilitar segmentação de dígitos no Tesseract
  const scale = cw < 900 ? 1.5 : 1;
  if (scale === 1) {
    return normCanvas.toDataURL('image/png');
  }

  const upCanvas = document.createElement('canvas');
  upCanvas.width = Math.round(cw * scale);
  upCanvas.height = Math.round(ch * scale);
  const upCtx = upCanvas.getContext('2d');
  if (!upCtx) return normCanvas.toDataURL('image/png');
  upCtx.imageSmoothingEnabled = true;
  upCtx.imageSmoothingQuality = 'high';
  upCtx.drawImage(normCanvas, 0, 0, upCanvas.width, upCanvas.height);
  return upCanvas.toDataURL('image/png');
}

export async function preprocessTicketImage(file: File): Promise<string> {
  return preprocessDataUrlForOcr(file, 0);
}

/**
 * Extrai metadados úteis do recibo térmico da Caixa (código de controle, concurso, cota e combinada).
 */
export function extractCaixaTicketMetadata(
  ocrText: string,
): ExtractedTicketMetadata {
  if (!ocrText) return {};
  const upper = ocrText.toUpperCase();

  // Código padrão Caixa (ex.: A424-A40057C1855A1B6C99-8) ou CONTROLE: 8492-1049...
  const boxCode =
    upper.match(/\b([A-Z0-9]{3,5}-[A-Z0-9]{10,22}-\d)\b/)?.[1] ||
    upper.match(/(?:CONTROLE|AUTENTICACAO|AUTENTICAÇÃO)\s*[:\-]?\s*([A-Z0-9\-]{8,30})/)?.[1];

  // COMBINADA 07 (zero cortado pode virar G7, O7, 67, 87)
  let combinadaDezenas: number | undefined;
  const combMatch = upper.match(/COMBINADA\s*([0O68G]?\d)/);
  if (combMatch) {
    const rawComb = combMatch[1];
    let val = parseInt(rawComb.replace(/^[OG]/, '0'), 10);
    if (val > 20 && /^[689]\d$/.test(rawComb)) {
      val = parseInt(rawComb[1], 10);
    }
    if (val >= 5 && val <= 20) combinadaDezenas = val;
  }

  const concMatch = upper.match(/\bCONC(?:URSO)?\.?\s*(\d{3,5})\b/);
  const cotaMatch = upper.match(/\bCOTA\s+(\d{1,3}\s*\/\s*\d{1,3})\b/);

  return {
    codigoBilhete: boxCode,
    concurso: concMatch ? parseInt(concMatch[1], 10) : undefined,
    combinadaDezenas,
    cotaBolaoCaixa: cotaMatch ? cotaMatch[1].replace(/\s+/g, '') : undefined,
  };
}

/**
 * Desmembra tokens numéricos de uma linha de jogo térmico da Caixa e repara
 * o zero cortado (`Ø` lido como `8`, `9`, `6`, `O`, `@`, `©` ou `O96` -> `06`),
 * usando a propriedade oficial da Caixa de que cada jogo é impresso em ordem estritamente crescente.
 */
function parseThermalGameRowTokens(
  rawLine: string,
  universo: number,
  minDezenas: number,
  maxDezenas: number,
  expectedCount?: number,
): { label?: string; numbers: number[] } | null {
  let s = rawLine.trim().toUpperCase();
  if (!s) return null;

  // Ignora códigos longos hexadecimais/barras (ex.: 383233400420131109484139001ca7abe)
  if (/[0-9A-Z]{18,}/.test(s.replace(/\s+/g, '')) && !/^\s*(?:JOGO|[0O]?[A-J])\s+\d/i.test(s)) {
    const longestContiguous = Math.max(
      ...s.split(/\s+/).map((tok) => tok.length),
    );
    if (longestContiguous >= 16) return null;
  }

  // Extrai letra do jogo (A, B, C, D, E... ou JOGO 01, ou OCR "0D" / "BB" / "F" no início da linha)
  let label: string | undefined;
  const jogoPrefix = s.match(/^(?:JOGO\s*(\d{1,2})\s*[:\-]?)\s+(.*)$/);
  if (jogoPrefix) {
    label = `Jogo ${jogoPrefix[1]}`;
    s = jogoPrefix[2];
  } else {
    const letterPrefix = s.match(/^(?:[0O]?\s*([A-J])(?:\1)?\s*[:\-]?)\s+(.*)$/);
    if (letterPrefix) {
      label = `Jogo ${letterPrefix[1]}`;
      s = letterPrefix[2];
    }
  }

  // Remove sufixo de Surpresinha / Teimosinha ("SU", "SL", "TM") e ruído da margem direita
  s = s.replace(/\s+(?:SU|SL|S[0O4]|TM|[A-Z]{1,2})\s*$/i, '').trim();

  // Substituições de caracteres parecidos com dígitos em fonte térmica
  s = s
    .replace(/[@©®OQ]/g, '0')
    .replace(/[IL|]/g, '1')
    .replace(/(\d)[G]/g, '$19');

  // Repara zero cortado lido como 3 caracteres "096" / "086" -> "06"
  s = s.replace(/\b0[689](\d)\b/g, '0$1');

  const rawTokens = s.split(/[\s,;\-]+/).filter(Boolean);
  if (rawTokens.length === 0) return null;

  // Filtra ruído isolado de 1 letra nas extremidades; se houver palavras no meio, rejeita a linha
  const digitStrings: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    if (/^\d+$/.test(tok)) {
      digitStrings.push(tok);
    } else if ((i === 0 || i === rawTokens.length - 1) && tok.length <= 2) {
      continue;
    } else {
      return null;
    }
  }

  // Expande blocos concatenados pares (ex.: "253338" -> ["25","33","38"], "2351" -> ["23","51"])
  const twoDigitTokens: string[] = [];
  for (const ds of digitStrings) {
    if (ds.length === 1 || ds.length === 2) {
      twoDigitTokens.push(ds);
    } else if (ds.length % 2 === 0 && ds.length <= maxDezenas * 2) {
      for (let k = 0; k < ds.length; k += 2) {
        twoDigitTokens.push(ds.slice(k, k + 2));
      }
    } else if (ds.length === 3 && ds.startsWith('0')) {
      // ex.: "096" residual -> "06"
      twoDigitTokens.push('0' + ds[2]);
    } else if (ds.length === 3) {
      // ex.: "912" -> "9", "12"
      twoDigitTokens.push(ds.slice(0, 1), ds.slice(1, 3));
    } else {
      return null;
    }
  }

  if (twoDigitTokens.length < minDezenas) {
    // Pode ser linha parcial (ex.: Lotofácil 5+5+5 dezenas)
    const partialNums = twoDigitTokens.map((t) => parseInt(t, 10));
    if (
      partialNums.length >= 3 &&
      partialNums.every((n) => n >= 1 && n <= universo)
    ) {
      return { label, numbers: partialNums };
    }
    return null;
  }

  // Reparo contextual de zero cortado ("05" -> "85", "09" -> "89" ou "99") usando ordem crescente!
  const resolved: number[] = [];
  for (let i = 0; i < twoDigitTokens.length; i++) {
    const tok = twoDigitTokens[i];
    let val = parseInt(tok, 10);
    const prev = resolved.length > 0 ? resolved[resolved.length - 1] : 0;

    if (
      tok.length === 2 &&
      /^[689][1-9]$/.test(tok) &&
      i + 1 < twoDigitTokens.length
    ) {
      const asSlashedZero = parseInt(tok[1], 10);
      // Olha o próximo token válido para saber se 0d encaixa estritamente em prev < 0d < next
      const rawNext = parseInt(twoDigitTokens[i + 1], 10);
      const nextHint =
        rawNext > universo && /^[689][1-9]$/.test(twoDigitTokens[i + 1])
          ? parseInt(twoDigitTokens[i + 1][1], 10)
          : rawNext;
      if (
        (val > universo || val <= prev || val >= nextHint) &&
        asSlashedZero > prev &&
        asSlashedZero < nextHint
      ) {
        val = asSlashedZero;
      }
    }

    resolved.push(val);
  }

  // Se o último token for ruído de margem direita (ex.: "SU" lido como "4" após as 7 dezenas crescentes), descarta-o
  const targetMin = expectedCount || minDezenas;
  if (
    resolved.length > targetMin &&
    resolved[resolved.length - 1] <= resolved[resolved.length - 2]
  ) {
    resolved.pop();
  }

  if (
    expectedCount &&
    resolved.length > expectedCount &&
    resolved.slice(0, expectedCount).every((n, idx, a) => idx === 0 || n > a[idx - 1])
  ) {
    resolved.splice(expectedCount);
  }

  return { label, numbers: resolved };
}

/**
 * Parser especializado para comprovantes térmicos da Caixa (apostas simples, múltiplas e Bolão Caixa com vários jogos A..J):
 * 1. Ignora cabeçalho, datas, horários, valores monetários, terminal e códigos de controle;
 * 2. Extrai múltiplos jogos (A, B, C, D, E...) do mesmo bilhete;
 * 3. Repara zero cortado térmico (`Ø`) e dezenas coladas sem espaço.
 */
export function parseCaixaTicketText(
  ocrText: string,
  modalidadePreferida?: string,
): ExtractedGameCandidate[] {
  if (!ocrText) return [];

  const upper = ocrText.toUpperCase();
  const inferred = /LOTOF[ÁA]CIL/.test(upper)
    ? 'Lotofácil'
    : /QUINA/.test(upper)
      ? 'Quina'
      : /DUPLA/.test(upper)
        ? 'Dupla Sena'
        : 'Mega-Sena';
  const modalidade = modalidadePreferida || inferred;
  const info = getModalidadeInfo(modalidade);
  const meta = extractCaixaTicketMetadata(ocrText);
  const expectedCount =
    meta.combinadaDezenas &&
    meta.combinadaDezenas >= info.minimoDezenas &&
    meta.combinadaDezenas <= info.maximoDezenas
      ? meta.combinadaDezenas
      : undefined;

  const candidates: ExtractedGameCandidate[] = [];
  let pending: number[] = [];
  let pendingRaw: string[] = [];

  const flushPending = () => {
    if (pending.length >= info.minimoDezenas) {
      try {
        validarDezenas(pending, modalidade);
        candidates.push({
          label: `Jogo ${candidates.length + 1}`,
          rawLine: pendingRaw.join('\n'),
          dezenas: [...pending].sort((a, b) => a - b),
          confianca: pendingRaw.length === 1 ? 'alta' : 'media',
          descricao: `Jogo identificado (${pending.length} dezenas) — confira no comprovante.`,
        });
      } catch {
        /* Bloco incompleto ou ambíguo não é chutado */
      }
    }
    pending = [];
    pendingRaw = [];
  };

  const metadataLineRegex =
    /\b(?:CONC(?:URSO)?|VALOR|TARIFA|PRECO|PREÇO|RESIDUO|RESÍDUO|PARTICIPA|TOTAL\s+DE|VALIDADE|RECIBO|SORTE|HORA|TERMINAL|LOTERIC[OA]|BOL[AÃ]O\s+CAIXA|COMBINADA|AGENCIA|SEGURAN|SERIE|APURAC|AUTENTIC|CONTROLE|BARRAS|FEDERAL|ECONOM|BILHETE|COTA\s+\d)\b|R\$|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}:\d{2}|\d{2}\s*[A-Z]{3}\s*\d{4}|\b[A-Z0-9]{3,5}-[A-Z0-9]{8,}/;

  for (const line of ocrText.split(/\r?\n/)) {
    const trimmed = line.trim().toUpperCase();
    if (!trimmed || metadataLineRegex.test(trimmed)) {
      flushPending();
      continue;
    }

    const parsedRow = parseThermalGameRowTokens(
      trimmed,
      info.universoNumeros,
      info.minimoDezenas,
      info.maximoDezenas,
      expectedCount,
    );

    if (!parsedRow) {
      flushPending();
      continue;
    }

    const { label, numbers } = parsedRow;

    if (numbers.length >= info.minimoDezenas) {
      flushPending();
      try {
        validarDezenas(numbers, modalidade);
        const letterIdx = candidates.length;
        const autoLabel =
          label && !/^Jogo \d+$/.test(label)
            ? label
            : `Jogo ${String.fromCharCode(65 + (letterIdx % 26))}`;
        candidates.push({
          label: autoLabel,
          rawLine: line.trim(),
          dezenas: [...numbers].sort((a, b) => a - b),
          confianca: 'alta',
          descricao: `${autoLabel} (${numbers.length} dezenas)`,
        });
      } catch {
        /* Linha inválida ignorada */
      }
    } else {
      pending.push(...numbers);
      pendingRaw.push(line.trim());
      if (pending.length >= info.minimoDezenas) {
        flushPending();
      }
    }
  }
  flushPending();

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
  },
];
