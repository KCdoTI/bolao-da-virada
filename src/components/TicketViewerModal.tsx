import React from "react";
import { Dialog } from "./Dialog";
import { ReceiptImage } from "./ReceiptImage";
export function TicketViewerModal({
  isOpen,
  onClose,
  imageUrl,
  gameIndex,
  dezenas = [],
  codigoBilhete,
}: {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  gameIndex: number;
  dezenas?: number[];
  codigoBilhete?: string;
}) {
  if (!isOpen) return null;
  return (
    <Dialog title={"Comprovante do jogo " + gameIndex} onClose={onClose}>
      <div className="space-y-4">
        <p>Dezenas registradas: {dezenas.join(" · ")}</p>
        {codigoBilhete && <p>Código informado: {codigoBilhete}</p>}
        {imageUrl ? (
          <ReceiptImage
            source={imageUrl}
            alt={"Foto original do jogo " + gameIndex}
            className="w-full object-contain"
          />
        ) : (
          <p>Foto do comprovante não anexada.</p>
        )}
        <p className="text-sm">
          Imagem enviada pelo organizador. Confira o recibo físico; esta
          exibição não autentica uma aposta na Caixa.
        </p>
      </div>
    </Dialog>
  );
}
