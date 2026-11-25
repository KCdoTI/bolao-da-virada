import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NotificacaoEvento,
  PalpiteParticipante,
  PoolState,
} from "../types";

export interface PoolResponse extends PoolState {
  revision: number;
  adminToken?: string;
  createdToken?: string;
  regrasHash?: string;
  transparenciaLiberada?: boolean;
  resumo?: {
    participantes: number;
    cotas: number;
    cotas_pagas: number;
    jogos?: number;
    jogos_normais?: number;
    jogos_troco?: number;
    palpites?: number;
  };
  rateioPessoal?: number;
  rateioPessoalCotas?: number;
  rateioPessoalTroco?: number;
  totalPremio?: number;
  premioNormais?: number;
  premioTroco?: number;
  palpites?: (PalpiteParticipante & { is_meu?: boolean })[];
  eventos?: NotificacaoEvento[];
  history?: { at: string; action: string; digest: string }[];
}

function route() {
  const hash = window.location.hash;
  if (hash.startsWith("#admin-"))
    return { admin: hash.slice(7), slug: "", personal: "" };
  if (hash.startsWith("#cota-")) {
    const [slug, personal] = hash.slice(6).split(".");
    return { admin: "", slug, personal: personal || "" };
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
    if (!location.admin && !location.slug) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !lock.current) {
        void reload();
      }
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

  async function participantAction(
    action:
      | "inscrever_publico"
      | "aceitar_regras"
      | "informar_pagamento"
      | "enviar_palpite"
      | "remover_palpite",
    payload?: any,
  ) {
    if (lock.current || !location.slug) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await request("/api/participante", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(location.personal
            ? { "X-Participant-Token": location.personal }
            : {}),
        },
        body: JSON.stringify({
          slug: location.slug,
          action,
          payload,
        }),
      });
      setData(next);
      if (action === "inscrever_publico" && next.createdToken) {
        window.location.hash = `cota-${location.slug}.${next.createdToken}`;
      }
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function ackEvents(ackUpTo: number) {
    if (!location.admin) return false;
    try {
      await fetch("/api/eventos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + location.admin,
        },
        body: JSON.stringify({ ackUpTo }),
      });
      await reload();
      return true;
    } catch {
      return false;
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
    participantAction,
    ackEvents,
    uploadReceipt,
    adminToken: location.admin,
    slug: location.slug,
    personalToken: location.personal,
    isAdmin: !!location.admin,
  };
}
