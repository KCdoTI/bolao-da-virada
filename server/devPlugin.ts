import type { Plugin } from "vite";
import express from "express";
import handler from "../api/bolao.js";
import receiptHandler from "../api/comprovante.js";
import lotteryHandler from "../api/loteria.js";
export function poolApi(): Plugin {
  return {
    name: "pool-api",
    configureServer(server) {
      const api = express();
      api.use(express.json({ limit: "3500kb" }));
      api.all("/api/bolao", handler);
      api.all("/api/comprovante", receiptHandler);
      api.all("/api/loteria", lotteryHandler);
      api.use((err: any, _req: any, res: any, _next: any) =>
        res
          .status(err.status || 500)
          .json({ error: "Requisição inválida ou muito grande." }),
      );
      server.middlewares.use(api);
    },
  };
}
