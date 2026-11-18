import React, { useState } from "react";
import type { Bolao } from "../types";
import { getModalidadeInfo } from "../constants/lotteryCatalog";
import { combinacao } from "../utils/lotteryEngine";
import { currency } from "./PainelConferencia";
import { Dialog } from "./Dialog";
export function PlanejadorModal({
  bolao,
  onClose,
}: {
  bolao: Bolao;
  onClose: () => void;
}) {
  const info = getModalidadeInfo(bolao.modalidade);
  const [cotas, setCotas] = useState(8);
  const [dezenas, setDezenas] = useState(info.minimoDezenas);
  const budget = Math.round(cotas * bolao.valor_cota * 100);
  const cost = Math.round(
    combinacao(dezenas, info.minimoDezenas) * info.valorApostaSimples * 100,
  );
  const tickets = Math.floor(budget / cost);
  return (
    <Dialog title="Planejar orçamento" onClose={onClose}>
      <div className="space-y-4">
        <p>
          {bolao.modalidade} · cota de {currency(bolao.valor_cota)}
        </p>
        <label>
          Cotas previstas
          <input
            type="number"
            min="1"
            max="1000000"
            value={cotas}
            onChange={(e) =>
              setCotas(
                Math.max(1, Math.min(1000000, Number(e.target.value) || 1)),
              )
            }
          />
        </label>
        <label>
          Dezenas por aposta
          <select
            value={dezenas}
            onChange={(e) => setDezenas(Number(e.target.value))}
          >
            {Array.from(
              { length: info.maximoDezenas - info.minimoDezenas + 1 },
              (_, i) => (
                <option key={i}>{info.minimoDezenas + i}</option>
              ),
            )}
          </select>
        </label>
        <p>
          Orçamento: <strong>{currency(budget / 100)}</strong>
        </p>
        <p>
          Aposta de {dezenas} dezenas: <strong>{currency(cost / 100)}</strong>
        </p>
        <p>
          Cabem <strong>{tickets} apostas</strong>, com sobra de{" "}
          {currency((budget - tickets * cost) / 100)}.
        </p>
        <p className="text-sm">
          Estimativa sem tarifa de serviço. Defina com o grupo o destino da
          sobra. A quantidade oficial de cotas por recibo depende da modalidade
          e das dezenas; confirme na lotérica.
        </p>
        <p className="text-sm">
          Jogos distintos ampliam a quantidade de combinações cobertas. Nenhuma
          escolha de dezenas prevê o sorteio. O planejamento não altera o prazo
          do grupo.
        </p>
        <a
          className="underline"
          target="_blank"
          rel="noreferrer"
          href="https://loterias.caixa.gov.br/"
        >
          Conferir preços e regras na Caixa
        </a>
      </div>
    </Dialog>
  );
}
