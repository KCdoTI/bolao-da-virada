import { getStore } from "../server/store.js";
import {
  createPool,
  readPool,
  updatePool,
  HttpError,
} from "../server/poolService.js";
import { fetchOfficialDraw } from "../server/caixa.js";
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const credential =
      /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
        req.headers.authorization || "",
      )?.[1] || "";
    if (!["GET", "POST", "PUT"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST, PUT");
      throw new HttpError(405, "Método não permitido.");
    }
    if (
      req.method !== "GET" &&
      !String(req.headers["content-type"] || "").startsWith("application/json")
    )
      throw new HttpError(415, "Envie JSON.");
    if (JSON.stringify(req.body || {}).length > 3500000)
      throw new HttpError(
        413,
        "O bolão excede o limite de 3,5 MB. Reduza as fotos.",
      );
    if (req.method === "PUT" && !credential)
      throw new HttpError(401, "Acesso do organizador necessário.");
    const store = await getStore();
    if (req.method === "GET")
      return res
        .status(200)
        .json(
          await readPool(
            store,
            String(req.query.id || ""),
            credential,
            req.headers["x-participant-token"],
          ),
        );
    if (req.method === "POST")
      return res.status(201).json(await createPool(store, req.body));
    let { state, revision, action, targetModalidade, targetConcurso } =
      req.body || {};
    if (
      ![
        "atualizado",
        "participante_editado",
        "cota_entregue_atualizada",
        "jogo_pos_prazo",
        "confirmacao_pos_prazo",
        "adiar_concurso",
        "fechado",
        "resultado_manual",
        "resultado_extra_manual",
        "importar_caixa",
        "importar_caixa_extra",
        "revogar_link",
      ].includes(action)
    )
      action = "atualizado";
    if (action === "importar_caixa") {
      const current = await readPool(store, "", credential);
      const result = await fetchOfficialDraw(
        current.bolao.modalidade,
        current.bolao.concurso_numero,
      );
      state = {
        bolao: { ...current.bolao, resultado: result },
        participantes: current.participantes,
        jogos: current.jogos,
      };
    } else if (action === "importar_caixa_extra") {
      const current = await readPool(store, "", credential);
      const mod = String(targetModalidade || "").trim();
      const conc = Number(targetConcurso);
      if (!mod || !Number.isInteger(conc) || conc < 1) {
        throw new HttpError(
          400,
          "Informe modalidade e concurso do jogo de troco.",
        );
      }
      const result = await fetchOfficialDraw(mod, conc);
      const prevExtras = (current.bolao.resultados_extras || []).filter(
        (r: any) => !(r.modalidade === mod && r.concurso === conc),
      );
      state = {
        bolao: {
          ...current.bolao,
          resultados_extras: [...prevExtras, result],
        },
        participantes: current.participantes,
        jogos: current.jogos,
      };
    }
    return res
      .status(200)
      .json(
        await updatePool(
          store,
          credential,
          state,
          revision,
          action,
          action === "importar_caixa" || action === "importar_caixa_extra",
        ),
      );
  } catch (e) {
    const known = e instanceof HttpError;
    const status = known
      ? e.status
      : e instanceof Error && /dezenas|Premiação/.test(e.message)
        ? 400
        : 503;
    return res
      .status(status)
      .json({
        error:
          known || status === 400
            ? (e as Error).message
            : "Serviço indisponível. Nenhuma alteração foi confirmada. Tente novamente.",
      });
  }
}
