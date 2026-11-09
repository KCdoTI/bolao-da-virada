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
 * Parser focado no layout de comprovantes da Caixa:
 * 1. Remove linhas de cabeçalho, datas, valores e identificadores.
 * 2. Trata substituições comuns de OCR em fontes térmicas.
 * 3. Encontra agrupamentos contínuos de 6 a 15 dezenas (entre 01 e 60).
 */
export function parseCaixaTicketText(ocrText: string): ExtractedGameCandidate[] {
  if (!ocrText) return [];

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
    if (!trimmed || trimmed.length < 10) continue;

    const upper = trimmed.toUpperCase();
    if (blacklist.some((term) => upper.includes(term))) {
      continue;
    }

    // Normaliza potenciais confusões do OCR em fontes pontilhadas térmicas
    const normalized = upper
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[,;.\-_/:]/g, ' ');

    const matches = normalized.match(/\b\d{1,2}\b/g);

    if (matches) {
      const numbers = matches
        .map((n) => parseInt(n, 10))
        .filter((n) => n >= 1 && n <= 60);

      const uniqueSorted = Array.from(new Set(numbers)).sort((a, b) => a - b);

      if (uniqueSorted.length >= 6 && uniqueSorted.length <= 15) {
        candidates.push({
          rawLine: trimmed,
          dezenas: uniqueSorted,
          confianca: uniqueSorted.length === 6 ? 'alta' : 'media',
          descricao: `Sequência de ${uniqueSorted.length} dezenas detectada`,
        });
      }
    }
  }

  // Se nenhuma linha isolada continha as 6 dezenas, tenta varrer todo o texto coletivo
  if (candidates.length === 0) {
    const cleanAll = ocrText
      .toUpperCase()
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[,;.\-_/:]/g, ' ');

    const allMatches = cleanAll.match(/\b\d{1,2}\b/g);
    if (allMatches) {
      const allNumbers = allMatches
        .map((n) => parseInt(n, 10))
        .filter((n) => n >= 1 && n <= 60);
      const unique = Array.from(new Set(allNumbers)).sort((a, b) => a - b);

      if (unique.length >= 6) {
        const slice = unique.slice(0, Math.min(15, unique.length));
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
VALOR DA APOSTA: R$ 5,00
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
VALOR R$ 35,00
AUTENTICACAO 9921-4820-1102
    `.trim(),
    dezenasEsperadas: [3, 10, 18, 34, 42, 55, 60],
  },
  {
    nome: 'Bilhete 03 - Aposta Especial (8 dezenas)',
    rawText: `
LOTERIAS CAIXA
AGENCIA CENTRAL
MEGA DA VIRADA 2810
JOGO APOSTA MULTIPLA
05 10 18 25 34 42 51 59
VALOR R$ 140,00
    `.trim(),
    dezenasEsperadas: [5, 10, 18, 25, 34, 42, 51, 59],
  }
];
