import {
  getModalidadeInfo,
  CATALOGO_MODALIDADES,
} from "../constants/lotteryCatalog.js";

export function validarDezenas(
  dezenas: unknown,
  modalidade: string,
  sorteio = false,
): asserts dezenas is number[] {
  if (!CATALOGO_MODALIDADES[modalidade])
    throw new Error("Modalidade desconhecida.");
  const info = getModalidadeInfo(modalidade);
  const min = sorteio ? info.qtdDezenasSorteadas : info.minimoDezenas;
  const max = sorteio ? min : info.maximoDezenas;
  if (
    !Array.isArray(dezenas) ||
    dezenas.length < min ||
    dezenas.length > max ||
    dezenas.some(
      (n) => !Number.isInteger(n) || n < 1 || n > info.universoNumeros,
    ) ||
    new Set(dezenas).size !== dezenas.length
  ) {
    throw new Error(
      `${info.nome}: informe ${min === max ? min : `${min} a ${max}`} dezenas distintas entre 1 e ${info.universoNumeros}.`,
    );
  }
}

/**
 * Valida palpites livres enviados pelos participantes:
 * permite sugerir de 1 até o máximo de dezenas da modalidade (ex.: 1 a 20 na Mega-Sena),
 * sem obrigar a cravar apenas a aposta mínima de 6 dezenas.
 */
export function validarPalpiteDezenas(
  dezenas: unknown,
  modalidade: string,
): asserts dezenas is number[] {
  if (!CATALOGO_MODALIDADES[modalidade])
    throw new Error("Modalidade desconhecida.");
  const info = getModalidadeInfo(modalidade);
  const max = info.maximoDezenas;
  if (
    !Array.isArray(dezenas) ||
    dezenas.length < 1 ||
    dezenas.length > max ||
    dezenas.some(
      (n) => !Number.isInteger(n) || n < 1 || n > info.universoNumeros,
    ) ||
    new Set(dezenas).size !== dezenas.length
  ) {
    throw new Error(
      `Palpite inválido para ${info.nome}: escolha entre 1 e ${max} dezenas distintas (de 1 a ${info.universoNumeros}).`,
    );
  }
}
