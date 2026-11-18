import {
  getModalidadeInfo,
  CATALOGO_MODALIDADES,
} from "../constants/lotteryCatalog";

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
