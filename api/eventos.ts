import { getStore } from "../server/store.js";
import { managePoolEvents, HttpError } from "../server/poolService.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const credential =
      /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
        req.headers.authorization || "",
      )?.[1] || "";
    if (!credential) {
      throw new HttpError(401, "Informe Authorization: Bearer <adminToken>.");
    }

    const store = await getStore();

    if (req.method === "GET") {
      const onlyUnacked = req.query?.unack === "1" || req.query?.unack === "true";
      const sinceSeq = req.query?.since_seq
        ? Number(req.query.since_seq)
        : undefined;
      const data = await managePoolEvents(store, credential, {
        onlyUnacked,
        sinceSeq: Number.isFinite(sinceSeq) ? sinceSeq : undefined,
      });
      return res.status(200).json(data);
    }

    // POST -> Confirma leitura (ack) até determinado seq
    const ackUpTo = Number(req.body?.ackUpTo || 0);
    const data = await managePoolEvents(store, credential, {
      ackUpTo: Number.isFinite(ackUpTo) ? ackUpTo : 0,
      onlyUnacked: true,
    });
    return res.status(200).json(data);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 503;
    return res.status(status).json({
      error:
        e instanceof HttpError
          ? e.message
          : "Não foi possível consultar os eventos do bolão.",
    });
  }
}
