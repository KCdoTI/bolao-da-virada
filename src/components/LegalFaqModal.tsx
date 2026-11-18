import React from "react";
import { Dialog } from "./Dialog";
export function LegalFaqModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <Dialog title="Sobre o aplicativo e as regras" onClose={onClose}>
      <div className="space-y-4">
        <p>
          Este aplicativo organiza registros de um grupo. Não vende apostas, não
          recebe PIX e não emite cotas oficiais da Caixa.
        </p>
        <p>
          Os recibos originais comprovam o registro da aposta. OCR auxilia a
          digitação e exige revisão humana; um hash permite comparar registros,
          mas não autentica o bilhete nem é uma assinatura digital.
        </p>
        <p>
          O organizador confirma pagamentos manualmente. Antes de fechar,
          confira participantes, jogos, recibos e regras com o grupo. Após o
          fechamento ou o prazo, esses dados ficam congelados.
        </p>
        <p>
          O link administrativo permite editar. O link público mostra apenas
          números e totais; cada link pessoal mostra a participação de seu
          titular. Guarde os links privados com cuidado.
        </p>
        <p>
          As regras de recebimento, prazos e documentação são definidas pela
          Caixa. O aplicativo não garante premiação ou aprovação em lojas de
          aplicativos. É necessário acesso à internet para consultar e salvar.
        </p>
        <a
          className="underline"
          href="https://loterias.caixa.gov.br/"
          target="_blank"
          rel="noreferrer"
        >
          Consultar o portal oficial das Loterias Caixa
        </a>
      </div>
    </Dialog>
  );
}
