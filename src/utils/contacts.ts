/**
 * Utilitário para integração com a Agenda de Contatos do celular:
 * 1. Contact Picker API nativa (`navigator.contacts.select`) para Chrome/Android;
 * 2. Parser completo de arquivos vCard (`.vcf` 2.1 / 3.0 / 4.0, incluindo Quoted-Printable UTF-8 do iPhone/Android/WhatsApp);
 * 3. Parser de lista rápida colada ("Nome - Telefone - Cotas").
 */

export interface ContatoImportado {
  nome: string;
  telefone: string;
  cotasSugeridas: number;
}

export function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof (navigator as any).contacts?.select === 'function'
  );
}

export function formatarTelefoneBr(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  // Remove DDI 55 se vier com 12 ou 13 dígitos
  const local =
    digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
      ? digits.slice(2)
      : digits;

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return raw.trim();
}

/**
 * Abre o seletor nativo da agenda do celular (Chrome Android).
 * Lê estritamente os contatos selecionados pelo usuário (LGPD).
 */
export async function pickContactsFromDevice(
  multiple = false,
): Promise<ContatoImportado[]> {
  if (!isContactPickerSupported()) {
    throw new Error(
      'Este navegador não possui seletor direto de agenda (no iPhone/PC, use a opção Importar Cartão de Contato .vcf ou cole da área de transferência).',
    );
  }
  const rawList: { name?: string[]; tel?: string[] }[] = await (
    navigator as any
  ).contacts.select(['name', 'tel'], { multiple });

  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  return rawList
    .map((item) => {
      const nome = (item.name?.[0] || '').trim();
      const tel = formatarTelefoneBr(item.tel?.[0] || '');
      return {
        nome: nome || 'Contato sem nome',
        telefone: tel,
        cotasSugeridas: 1,
      };
    })
    .filter((c) => Boolean(c.nome || c.telefone));
}

/**
 * Decodifica strings Quoted-Printable em UTF-8 usadas em vCards 2.1 do Android/Samsung.
 * Ex.: "=C3=81lvaro" -> "Álvaro"
 */
export function decodeQuotedPrintableUtf8(input: string): string {
  const joined = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    if (
      joined[i] === '=' &&
      i + 2 < joined.length &&
      /^[0-9A-Fa-f]{2}$/.test(joined.slice(i + 1, i + 3))
    ) {
      bytes.push(parseInt(joined.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const encoded = new TextEncoder().encode(joined[i]);
      for (const b of encoded) bytes.push(b);
    }
  }
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return joined;
  }
}

/**
 * Extrai um ou vários contatos de um arquivo `.vcf` (vCard compartilhado do WhatsApp, iPhone ou Android).
 */
export function parseVCardContacts(vcfText: string): ContatoImportado[] {
  if (!vcfText || !/BEGIN:VCARD/i.test(vcfText)) return [];

  // Desdobra linhas continuadas (RFC 6350: linha começando por espaço/tab continua a anterior;
  // ou Quoted-Printable terminando com '=' na linha anterior)
  const unfolded = vcfText
    .replace(/=\r?\n[ \t]?/g, '=')
    .replace(/\r?\n[ \t]/g, '');

  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const contacts: ContatoImportado[] = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.split(/END:VCARD/i)[0] || '';
    const lines = block.split(/\r?\n/);

    let fn = '';
    let fallbackN = '';
    const phones: { preferred: boolean; value: string }[] = [];

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx <= 0) continue;

      const header = line.slice(0, colonIdx).trim();
      let rawValue = line.slice(colonIdx + 1).trim();
      const upperHeader = header.toUpperCase();
      const isQp = upperHeader.includes('ENCODING=QUOTED-PRINTABLE');

      if (isQp) {
        rawValue = decodeQuotedPrintableUtf8(rawValue);
      }

      const propName = upperHeader.split(';')[0];

      if (propName === 'FN') {
        fn = rawValue.replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
      } else if (propName === 'N' && !fallbackN) {
        const parts = rawValue
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean);
        // Formato N: Sobrenome;Nome;Meio;Prefixo;Sufixo
        if (parts.length >= 2) {
          fallbackN = `${parts[1]} ${parts[0]}`.trim();
        } else if (parts.length === 1) {
          fallbackN = parts[0];
        }
      } else if (propName === 'TEL') {
        const cleaned = formatarTelefoneBr(rawValue);
        if (cleaned) {
          const preferred =
            upperHeader.includes('CELL') ||
            upperHeader.includes('PREF') ||
            upperHeader.includes('IPHONE');
          phones.push({ preferred, value: cleaned });
        }
      }
    }

    const nomeFinal = (fn || fallbackN).trim();
    const chosenPhone =
      phones.find((p) => p.preferred)?.value || phones[0]?.value || '';

    if (nomeFinal || chosenPhone) {
      contacts.push({
        nome: nomeFinal || 'Contato importado',
        telefone: chosenPhone,
        cotasSugeridas: 1,
      });
    }
  }

  return contacts;
}

/**
 * Interpreta uma lista colada pelo organizador (uma pessoa por linha), ex.:
 * "Mariana Silva - (11) 98765-4321 - 2"
 * "Carlos Souza; 21999887766"
 */
export function parsePastedContactsList(text: string): ContatoImportado[] {
  const results: ContatoImportado[] = [];
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line
      .split(/[;|\t]+|\s+-\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let nome = '';
    let telefone = '';
    let cotas = 1;

    if (parts.length >= 2) {
      nome = parts[0];
      telefone = formatarTelefoneBr(parts[1]);
      if (parts[2] && /^\d{1,4}$/.test(parts[2].replace(/cotas?/i, '').trim())) {
        cotas = Math.max(1, parseInt(parts[2], 10));
      }
    } else {
      // Tenta separar nome e telefone na mesma string: "João (11) 98888-7777"
      const phoneMatch = line.match(/(\+?\d[\d\s().\-]{8,}\d)/);
      if (phoneMatch) {
        telefone = formatarTelefoneBr(phoneMatch[1]);
        nome = line.replace(phoneMatch[1], '').replace(/[-;,]+$/, '').trim();
      } else {
        nome = line;
      }
    }

    if (nome) {
      results.push({
        nome: nome.slice(0, 120),
        telefone,
        cotasSugeridas: cotas,
      });
    }
  }
  return results;
}
