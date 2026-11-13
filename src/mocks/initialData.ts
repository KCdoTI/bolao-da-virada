import { Bolao, Participante, Jogo } from '../types';

export const mockBolao: Bolao = {
  id: 'bolao-mega-2026',
  nome: 'Bolão da Mega — Gestão de Cotas',
  modalidade: 'Mega-Sena',
  concurso_numero: 2810,
  valor_cota: 12.00,
  data_limite: '2026-11-19T17:00:00',
  chave_pix_organizador: 'kelvin.organizador@pix.com.br',
  nome_organizador: 'Kelvin Castro',
  status: 'aberto',
  dezenas_sorteadas: [5, 10, 18, 34, 42, 59],
  hash_slug: 'mega-2026-k8p1',
  regra_downgrade: 'cortar_satelites',
  horario_limite_loterica: '18:00',
  regras: [
    'O valor de cada cota é de R$ 12,00.',
    'Apenas cotas com pagamento confirmado até a data limite participam da divisão de qualquer premiação.',
    'Todas as apostas são registradas em lotéricas oficiais da Caixa Econômica Federal com comprovante fotográfico disponível.',
    'O rateio de prêmios será estritamente proporcional ao número de cotas pagas por cada participante.',
    'Caso o prêmio principal (Sena) ou secundário (Quina/Quadra) seja contemplado, o resgate será efetuado pelo organizador e repassado via PIX em até 48h úteis.'
  ]
};

export const mockParticipantes: Participante[] = [
  { id: 'p-1', bolao_id: 'bolao-mega-2026', nome: 'Kelvin Castro (Organizador)', telefone: '(11) 98765-4321', qtd_cotas: 2, status_pagamento: 'Pago', data_registro: '2026-11-10', token_acesso: 'cot_kelvin_org' },
  { id: 'p-2', bolao_id: 'bolao-mega-2026', nome: 'Mariana Rios', telefone: '(11) 97123-8899', qtd_cotas: 1, status_pagamento: 'Pago', data_registro: '2026-11-10', token_acesso: 'cot_mariana_r' },
  { id: 'p-3', bolao_id: 'bolao-mega-2026', nome: 'Lucas Mendonça', telefone: '(21) 99876-1234', qtd_cotas: 1, status_pagamento: 'Pago', data_registro: '2026-11-11', token_acesso: 'cot_lucas_m' },
  { id: 'p-4', bolao_id: 'bolao-mega-2026', nome: 'Fernanda Souza', telefone: '(31) 98456-7890', qtd_cotas: 1, status_pagamento: 'Pendente', data_registro: '2026-11-11', token_acesso: 'cot_fernanda_s' },
  { id: 'p-5', bolao_id: 'bolao-mega-2026', nome: 'Rafael Torres', telefone: '(41) 99112-3344', qtd_cotas: 1, status_pagamento: 'Pago', data_registro: '2026-11-11', token_acesso: 'cot_rafael_t' },
  { id: 'p-6', bolao_id: 'bolao-mega-2026', nome: 'Beatriz Almeida', telefone: '(19) 98223-4455', qtd_cotas: 1, status_pagamento: 'Pago', data_registro: '2026-11-12', token_acesso: 'cot_beatriz_a' },
  { id: 'p-7', bolao_id: 'bolao-mega-2026', nome: 'Guilherme Rocha', telefone: '(81) 99334-5566', qtd_cotas: 1, status_pagamento: 'Pendente', data_registro: '2026-11-12', token_acesso: 'cot_guilherme_r' },
  { id: 'p-8', bolao_id: 'bolao-mega-2026', nome: 'Juliana Costa', telefone: '(71) 98445-6677', qtd_cotas: 1, status_pagamento: 'Pago', data_registro: '2026-11-12', token_acesso: 'cot_juliana_c' },
];

// Comprovantes gráficos em SVG codificados para exibição nítida e segura sem links externos frágeis
const sampleTicketSvg1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" style="background:%23f7f4ea;font-family:monospace;padding:20px;color:%23222"><text x="200" y="40" text-anchor="middle" font-weight="bold" font-size="18">CAIXA ECONOMICA FEDERAL</text><text x="200" y="65" text-anchor="middle" font-size="14">COMPROVANTE DE APOSTA</text><text x="200" y="85" text-anchor="middle" font-size="12">LOTERICA OURO DA SORTE - SP</text><line x1="20" y1="100" x2="380" y2="100" stroke="%23333" stroke-dasharray="4"/><text x="30" y="130" font-size="13" font-weight="bold">MEGA DA VIRADA - CONC: 2810</text><text x="30" y="150" font-size="11">DATA APURACAO: 31/12/2026 20:00</text><text x="30" y="180" font-size="12">JOGO 01 (06 DEZENAS):</text><text x="30" y="210" font-size="20" font-weight="bold" fill="%23047857">05 - 10 - 18 - 34 - 42 - 59</text><text x="30" y="250" font-size="12">VALOR DA APOSTA: R$ 5,00</text><text x="30" y="280" font-size="11">TERMINAL: 04.912.842-1</text><text x="30" y="300" font-size="11">CONTROLE: 8492-1049-5832-1920</text><line x1="20" y1="330" x2="380" y2="330" stroke="%23333" stroke-dasharray="4"/><rect x="80" y="360" width="240" height="60" fill="%23222"/><text x="200" y="395" text-anchor="middle" fill="%23fff" font-size="12">CODIGO DE BARRAS AUTENTICADO</text><text x="200" y="460" text-anchor="middle" font-size="11">VALOR PAGO EM DINHEIRO</text><text x="200" y="480" text-anchor="middle" font-size="10">GUARDE ESTE COMPROVANTE</text></svg>`;

const sampleTicketSvg2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" style="background:%23f7f4ea;font-family:monospace;padding:20px;color:%23222"><text x="200" y="40" text-anchor="middle" font-weight="bold" font-size="18">CAIXA ECONOMICA FEDERAL</text><text x="200" y="65" text-anchor="middle" font-size="14">COMPROVANTE DE APOSTA</text><text x="200" y="85" text-anchor="middle" font-size="12">LOTERICA TREVO DE OURO - RJ</text><line x1="20" y1="100" x2="380" y2="100" stroke="%23333" stroke-dasharray="4"/><text x="30" y="130" font-size="13" font-weight="bold">MEGA DA VIRADA - CONC: 2810</text><text x="30" y="150" font-size="11">DATA APURACAO: 31/12/2026 20:00</text><text x="30" y="180" font-size="12">JOGO 02 (07 DEZENAS - ESPECIAL):</text><text x="30" y="210" font-size="17" font-weight="bold" fill="%23047857">03 - 10 - 18 - 34 - 42 - 55 - 60</text><text x="30" y="250" font-size="12">VALOR DA APOSTA: R$ 35,00</text><text x="30" y="280" font-size="11">TERMINAL: 02.441.711-8</text><text x="30" y="300" font-size="11">CONTROLE: 1209-4820-9921-3401</text><line x1="20" y1="330" x2="380" y2="330" stroke="%23333" stroke-dasharray="4"/><rect x="80" y="360" width="240" height="60" fill="%23222"/><text x="200" y="395" text-anchor="middle" fill="%23fff" font-size="12">CODIGO DE BARRAS AUTENTICADO</text><text x="200" y="460" text-anchor="middle" font-size="11">VALOR PAGO EM PIX LOTERICA</text></svg>`;

const sampleTicketSvg3 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" style="background:%23f7f4ea;font-family:monospace;padding:20px;color:%23222"><text x="200" y="40" text-anchor="middle" font-weight="bold" font-size="18">CAIXA ECONOMICA FEDERAL</text><text x="200" y="65" text-anchor="middle" font-size="14">COMPROVANTE DE APOSTA</text><text x="200" y="85" text-anchor="middle" font-size="12">LOTERICA PAULISTA - SP</text><line x1="20" y1="100" x2="380" y2="100" stroke="%23333" stroke-dasharray="4"/><text x="30" y="130" font-size="13" font-weight="bold">MEGA DA VIRADA - CONC: 2810</text><text x="30" y="150" font-size="11">DATA APURACAO: 31/12/2026 20:00</text><text x="30" y="180" font-size="12">JOGO 03 (06 DEZENAS):</text><text x="30" y="210" font-size="20" font-weight="bold" fill="%23047857">07 - 14 - 23 - 39 - 48 - 56</text><text x="30" y="250" font-size="12">VALOR DA APOSTA: R$ 5,00</text><text x="30" y="280" font-size="11">TERMINAL: 01.884.229-3</text><text x="30" y="300" font-size="11">CONTROLE: 5543-9812-3321-7711</text><line x1="20" y1="330" x2="380" y2="330" stroke="%23333" stroke-dasharray="4"/><rect x="80" y="360" width="240" height="60" fill="%23222"/><text x="200" y="395" text-anchor="middle" fill="%23fff" font-size="12">CODIGO DE BARRAS AUTENTICADO</text></svg>`;

const sampleTicketSvg4 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" style="background:%23f7f4ea;font-family:monospace;padding:20px;color:%23222"><text x="200" y="40" text-anchor="middle" font-weight="bold" font-size="18">CAIXA ECONOMICA FEDERAL</text><text x="200" y="65" text-anchor="middle" font-size="14">COMPROVANTE DE APOSTA</text><text x="200" y="85" text-anchor="middle" font-size="12">LOTERICA ESTRELA GUIA - MG</text><line x1="20" y1="100" x2="380" y2="100" stroke="%23333" stroke-dasharray="4"/><text x="30" y="130" font-size="13" font-weight="bold">MEGA DA VIRADA - CONC: 2810</text><text x="30" y="150" font-size="11">DATA APURACAO: 31/12/2026 20:00</text><text x="30" y="180" font-size="12">JOGO 04 (08 DEZENAS - ESPECIAL):</text><text x="30" y="210" font-size="15" font-weight="bold" fill="%23047857">05 - 10 - 18 - 25 - 34 - 42 - 51 - 59</text><text x="30" y="250" font-size="12">VALOR DA APOSTA: R$ 140,00</text><text x="30" y="280" font-size="11">TERMINAL: 06.129.840-0</text><text x="30" y="300" font-size="11">CONTROLE: 9912-3341-8842-1002</text><line x1="20" y1="330" x2="380" y2="330" stroke="%23333" stroke-dasharray="4"/><rect x="80" y="360" width="240" height="60" fill="%23222"/><text x="200" y="395" text-anchor="middle" fill="%23fff" font-size="12">CODIGO DE BARRAS AUTENTICADO</text></svg>`;

export const mockJogos: Jogo[] = [
  {
    id: 'game-1',
    bolao_id: 'bolao-virada-2026',
    dezenas: [5, 10, 18, 34, 42, 59], // 6 acertos na simulação! (Sena)
    foto_url: sampleTicketSvg1,
    criado_em: '2026-12-15',
    codigo_bilhete: '8492-1049-5832-1920',
  },
  {
    id: 'game-2',
    bolao_id: 'bolao-virada-2026',
    dezenas: [3, 10, 18, 34, 42, 55, 60], // 4 acertos em jogo de 7 dezenas (desdobra em 3 Quadras!)
    foto_url: sampleTicketSvg2,
    criado_em: '2026-12-18',
    codigo_bilhete: '1209-4820-9921-3401',
  },
  {
    id: 'game-3',
    bolao_id: 'bolao-virada-2026',
    dezenas: [7, 14, 23, 39, 48, 56], // 0 acertos
    foto_url: sampleTicketSvg3,
    criado_em: '2026-12-20',
    codigo_bilhete: '5543-9812-3321-7711',
  },
  {
    id: 'game-4',
    bolao_id: 'bolao-virada-2026',
    dezenas: [5, 10, 18, 25, 34, 42, 51, 59], // 6 acertos em jogo de 8 dezenas! (1 Sena, 12 Quinas, 15 Quadras!)
    foto_url: sampleTicketSvg4,
    criado_em: '2026-12-22',
    codigo_bilhete: '9912-3341-8842-1002',
  }
];
