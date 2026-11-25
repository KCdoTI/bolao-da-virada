import { getStore } from "../server/store.js";
import { executeParticipantAction, HttpError } from "../server/poolService.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    if (
      !String(req.headers["content-type"] || "").startsWith("application/json")
    ) {
      throw new HttpError(415, "Envie JSON.");
    }
    if (JSON.stringify(req.body || {}).length > 64000) {
      throw new HttpError(413, "Dados enviados excedem o tamanho permitido.");
    }

    const slug = String(req.body?.slug || "").trim();
    const action = req.body?.action;
    const personalToken = String(
      req.headers["x-participant-token"] || req.body?.personalToken || "",
    ).trim();

    if (!slug) throw new HttpError(400, "Identificador do bolão ausente.");
    if (
      ![
        "inscrever_publico",
        "aceitar_regras",
        "informar_pagamento",
        "enviar_palpite",
        "remover_palpite",
      ].includes(action)
    ) {
      throw new HttpError(400, "Ação de participante inválida.");
    }

    const store = await getStore();
    const result = await executeParticipantAction(store, {
      slug,
      personalToken: personalToken || undefined,
      action,
      payload: req.body?.payload,
    });
    return res.status(200).json(result);
  } catch (e) {
    const known = e instanceof HttpError;
    const isValidation =
      e instanceof Error && /dezenas|Modalidade/.test(e.message);
    const status = known ? e.status : isValidation ? 400 : 503;
    return res.status(status).json({
      error:
        known || isValidation
          ? (e as Error).message
          : "Serviço temporariamente indisponível. Tente novamente.",
    });
  }
}
