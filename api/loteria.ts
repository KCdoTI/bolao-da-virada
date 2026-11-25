import { fetchLotteryLiveInfo } from "../server/lotteryInfo.js";
import { HttpError } from "../server/poolService.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const modalidade = String(req.query?.modalidade || "Mega-Sena");
    const refresh = req.query?.refresh === "1";
    const info = await fetchLotteryLiveInfo(modalidade, fetch, refresh);
    return res.status(200).json(info);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 502;
    const message = e instanceof HttpError
      ? e.message
      : "Portal de loterias temporariamente indisponível.";
    return res.status(status).json({ error: message });
  }
}
