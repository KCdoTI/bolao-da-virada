import { getStore } from "../server/store.js";
import { hashToken, HttpError } from "../server/poolService.js";
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
      req.headers.authorization || "",
    )?.[1];
    if (!token) throw new HttpError(401, "Acesso do organizador necessário.");
    const store = await getStore();
    const row = await store.get(hashToken(token), true);
    if (!row) throw new HttpError(403, "Acesso inválido.");
    if (req.method === "GET") {
      const data = await store.getReceipt(String(req.query.id || ""), row.id);
      if (!data) throw new HttpError(404, "Comprovante não encontrado.");
      return res.status(200).json({ data });
    }
    if (req.method !== "POST")
      throw new HttpError(405, "Método não permitido.");
    if (
      row.payload.bolao.fechado_em ||
      Date.now() >= Date.parse(row.payload.bolao.data_limite)
    )
      throw new HttpError(409, "Bolão encerrado.");
    if (
      !String(req.headers["content-type"] || "").startsWith("application/json")
    )
      throw new HttpError(415, "Envie JSON.");
    const data = req.body?.data;
    if (typeof data !== "string" || data.length > 2800000)
      throw new HttpError(413, "Use uma foto de até 2 MB.");
    const match =
      /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
    if (!match) throw new HttpError(400, "Formato de imagem inválido.");
    const bytes = Buffer.from(match[2], "base64");
    if (
      bytes.length > 2 * 1024 * 1024 ||
      !(
        (match[1] === "jpeg" &&
          bytes[0] === 255 &&
          bytes[1] === 216 &&
          bytes[2] === 255) ||
        (match[1] === "png" &&
          bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
        (match[1] === "webp" &&
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP")
      )
    )
      throw new HttpError(400, "Arquivo de imagem inválido.");
    const id = hashToken(row.id + data);
    await store.putReceipt(id, row.id, data);
    return res.status(201).json({ url: "receipt:" + id });
  } catch (e) {
    return res
      .status(e instanceof HttpError ? e.status : 503)
      .json({
        error:
          e instanceof HttpError
            ? e.message
            : "Não foi possível guardar o comprovante.",
      });
  }
}
