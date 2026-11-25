import { useCallback, useEffect, useState } from "react";
import type { LotteryLiveInfo } from "../types";

export function useLotteryInfo(modalidade: string, enabled = true) {
  const [info, setInfo] = useState<LotteryLiveInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!enabled || !modalidade) return;
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({ modalidade });
        if (forceRefresh) qs.set("refresh", "1");
        const res = await fetch(`/api/loteria?${qs.toString()}`, {
          signal: AbortSignal.timeout(12000),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || "Não foi possível consultar o portal da Caixa.");
        }
        setInfo(body as LotteryLiveInfo);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [modalidade, enabled],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return {
    lotteryInfo: info,
    loadingLottery: loading,
    lotteryError: error,
    refreshLottery: () => load(true),
  };
}
