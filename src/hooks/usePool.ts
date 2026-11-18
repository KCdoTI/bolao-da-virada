import { useCallback, useEffect, useRef, useState } from "react";
import type { PoolState } from "../types";
export interface PoolResponse extends PoolState {
  revision: number;
  adminToken?: string;
  resumo?: { participantes: number; cotas: number; cotas_pagas: number };
  rateioPessoal?: number;
  totalPremio?: number;
  history?: { at: string; action: string; digest: string }[];
}
function route() {
  const hash = window.location.hash;
  if (hash.startsWith("#admin-"))
    return { admin: hash.slice(7), slug: "", personal: "" };
  if (hash.startsWith("#cota-")) {
    const [slug, personal] = hash.slice(6).split(".");
    return { admin: "", slug, personal };
  }
  return {
    admin: "",
    slug: hash.startsWith("#b-") ? hash.slice(3) : "",
    personal: "",
  };
}
async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(20000),
  });
  const body = await res
    .json()
    .catch(() => ({ error: "O servidor não devolveu uma resposta válida." }));
  if (!res.ok) throw new Error(body.error || "Não foi possível salvar.");
  return body as PoolResponse;
}
export function usePool() {
  const [location, setLocation] = useState(route);
  const [data, setData] = useState<PoolResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const change = () => setLocation(route());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    if (!location.admin && !location.slug) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const next = await request(
        "/api/bolao?id=" + encodeURIComponent(location.slug),
        {
          headers: location.admin
            ? { Authorization: "Bearer " + location.admin }
            : location.personal
              ? { "X-Participant-Token": location.personal }
              : {},
        },
      );
      if (current === generation.current) setData(next);
    } catch (e) {
      if (current === generation.current) {
        setData(null);
        setError((e as Error).message);
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [location]);
  useEffect(() => {
    setData(null);
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  useEffect(() => {
    if (location.admin || !location.slug) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 30000);
    return () => clearInterval(timer);
  }, [location, reload]);
  async function save(state: PoolState, action = "atualizado", create = false) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await request("/api/bolao", {
        method: create ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(location.admin
            ? { Authorization: "Bearer " + location.admin }
            : {}),
        },
        body: JSON.stringify(
          create ? state : { state, revision: data?.revision, action },
        ),
      });
      setData(next);
      if (create && next.adminToken)
        window.location.hash = "admin-" + next.adminToken;
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function uploadReceipt(image: string) {
    try {
      const response = await fetch("/api/comprovante", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + location.admin,
        },
        body: JSON.stringify({ data: image }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      return body.url as string;
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    }
  }
  return {
    data,
    busy,
    loading,
    error,
    reload,
    save,
    uploadReceipt,
    adminToken: location.admin,
    isAdmin: !!location.admin,
  };
}
