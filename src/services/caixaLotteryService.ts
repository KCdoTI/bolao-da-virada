// A consulta oficial ocorre no servidor, em server/caixa.ts.
// Esta função legada permanece apenas para os diagnósticos históricos.
export async function fetchMegaSenaDraw(_concurso?: number): Promise<never> {
  throw new Error('Use a importação autenticada do bolão.');
}
