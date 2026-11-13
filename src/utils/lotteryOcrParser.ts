export interface ExtractedGameCandidate {
  rawLine: string;
  dezenas: number[];
  confianca: 'alta' | 'media';
  descricao: string;
}

/**
 * Aplica contraste e binarização via Canvas para melhorar o OCR
 * em comprovantes impressos em bobina térmica amarelada/acinzentada.
 */
export async function preprocessTicketImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(img.src);

        // Limita a resolução máxima para manter alta velocidade no OCR
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

        // Binarização em escala de cinza com corte limpo
        for (let i = 0; i < data.length; i += 4) {
          const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const threshold = avg > 130 ? 255 : 0;
          data[i] = threshold;
          data[i + 1] = threshold;
          data[i + 2] = threshold;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
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

  const upperAll = ocrText.toUpperCase();
  let maxNumber = 60;
  let minDezenas = 6;
  let maxDezenas = 15;

  const mod = (modalidadePreferida || '').toLowerCase();
  const isLoto = mod.includes('lotofácil') || mod.includes('lotofacil') || upperAll.includes('LOTOFACIL') || upperAll.includes('LOTOFÁCIL');
  const isQuina = mod.includes('quina') || upperAll.includes('QUINA');
  const isDupla = mod.includes('dupla') || upperAll.includes('DUPLA SENA');

  if (isLoto) {
    maxNumber = 25;
    minDezenas = 15;
    maxDezenas = 20;
  } else if (isQuina) {
    maxNumber = 80;
    minDezenas = 5;
    maxDezenas = 15;
  } else if (isDupla) {
    maxNumber = 50;
    minDezenas = 6;
    maxDezenas = 15;
  }

  const lines = ocrText.split('\n');
  const candidates: ExtractedGameCandidate[] = [];

  const blacklist = [
    'CONCURSO', 'VALOR', 'DATA', 'HORA', 'LOTERIAS', 'CAIXA',
    'TERMINAL', 'LOCAL', 'AGENCIA', 'PRODUTO', 'SEGURANCA', 'SERIE',
    'APURACAO', 'AUTENTICACAO', 'CONTROLE', 'BARRAS', 'FEDERAL',
    'ECONOMICA', 'LOTERICA', 'BILHETE'
  ];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.length < 8) continue;

    const upper = trimmed.toUpperCase();
    if (blacklist.some((term) => upper.includes(term))) {
      continue;
    }

    // Remove prefixos de bilhete como "JOGO 01:", "JOGO 1", "A - ", etc.
    const semPrefixo = upper
      .replace(/^JOGO\s*\d+\s*[:\-]?\s*/i, '')
      .replace(/^[A-Z]\s*[-:]\s*/i, '');

    // Normaliza potenciais confusões do OCR em fontes pontilhadas térmicas
    const normalized = semPrefixo
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[,;.\-_/:]/g, ' ');

    const matches = normalized.match(/\b\d{1,2}\b/g);

    if (matches) {
      const numbers = matches
        .map((n) => parseInt(n, 10))
        .filter((n) => n >= 1 && n <= maxNumber);

      const uniqueSorted = Array.from(new Set(numbers)).sort((a, b) => a - b);

      if (uniqueSorted.length >= minDezenas && uniqueSorted.length <= maxDezenas) {
        candidates.push({
          rawLine: trimmed,
          dezenas: uniqueSorted,
          confianca: uniqueSorted.length === minDezenas ? 'alta' : 'media',
          descricao: `Sequência de ${uniqueSorted.length} dezenas detectada (${isLoto ? 'Lotofácil' : isQuina ? 'Quina' : isDupla ? 'Dupla Sena' : 'Mega-Sena'})`,
        });
      }
    }
  }

  // Se nenhuma linha isolada continha o bloco completo (comum na Lotofácil com múltiplas linhas)
  if (candidates.length === 0) {
    const cleanAll = upperAll
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[,;.\-_/:]/g, ' ');

    const allMatches = cleanAll.match(/\b\d{1,2}\b/g);
    if (allMatches) {
      const allNumbers = allMatches
        .map((n) => parseInt(n, 10))
        .filter((n) => n >= 1 && n <= maxNumber);
      const unique = Array.from(new Set(allNumbers)).sort((a, b) => a - b);

      if (unique.length >= minDezenas) {
        const slice = unique.slice(0, Math.min(maxDezenas, unique.length));
        candidates.push({
          rawLine: 'Dezenas consolidadas do bilhete',
          dezenas: slice,
          confianca: 'media',
          descricao: `Extração consolidada (${slice.length} dezenas)`,
        });
      }
    }
  }

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
