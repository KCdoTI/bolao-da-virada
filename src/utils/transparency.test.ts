import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  maskPhone,
  calculateSha256,
  generateCanonicalManifest,
  buildWhatsAppIndividualParticipantLinkMessage,
  buildWhatsAppProofSubmissionUrl,
} from './transparency';
import { mockBolao, mockParticipantes, mockJogos } from '../mocks/initialData';

test('maskPhone conceals sensitive digits according to LGPD', () => {
  assert.equal(maskPhone('(11) 98765-4321'), '(11) 9****-4321');
  assert.equal(maskPhone('(21) 99876-1234'), '(21) 9****-1234');
});

test('calculateSha256 produces valid 64-char hexadecimal digest', async () => {
  const hash = await calculateSha256('teste-manifesto-bolao');
  assert.equal(hash.length, 64);
  assert.match(hash, /^[a-f0-9]{64}$/);
});

test('generateCanonicalManifest produces stable and sorted output', () => {
  const manifest1 = generateCanonicalManifest(mockBolao, mockParticipantes, mockJogos);
  const manifest2 = generateCanonicalManifest(mockBolao, mockParticipantes, mockJogos);
  assert.equal(manifest1, manifest2);
  assert.ok(manifest1.includes('bolao-mega-2026'));
  assert.ok(manifest1.includes('Kelvin Castro'));
});

test('buildWhatsAppProofSubmissionUrl creates proper direct whatsapp link', () => {
  const url = buildWhatsAppProofSubmissionUrl(
    '(11) 98765-4321',
    'Mariana Rios',
    'Mega da Virada 2026',
    2,
    100.00
  );
  assert.ok(url.startsWith('https://wa.me/5511987654321?text='));
  assert.ok(url.includes('Mariana%20Rios'));
});

test('buildWhatsAppIndividualParticipantLinkMessage formats participant invite message', () => {
  const msg = buildWhatsAppIndividualParticipantLinkMessage(
    mockParticipantes[1],
    mockBolao,
    'https://bolao.app/#cota-cot_mariana'
  );
  assert.ok(msg.includes('Mariana Rios'));
  assert.ok(msg.includes('https://bolao.app/#cota-cot_mariana'));
  assert.ok(msg.includes('kelvin.organizador@pix.com.br'));
});
