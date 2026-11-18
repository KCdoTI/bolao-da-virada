import React, { useEffect, useState } from "react";
export function ReceiptImage({
  source,
  alt,
  className,
}: {
  source: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!source.startsWith("receipt:")) {
      setUrl(source.startsWith("data:image/") ? source : "");
      return;
    }
    setUrl("");
    setError("");
    fetch("/api/comprovante?id=" + encodeURIComponent(source.slice(8)), {
      headers: { Authorization: "Bearer " + window.location.hash.slice(7) },
      signal: AbortSignal.timeout(15000),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (active) setUrl(data.data);
      })
      .catch(() => {
        if (active)
          setError(
            "Não foi possível carregar a foto. Reabra o comprovante para tentar novamente.",
          );
      });
    return () => {
      active = false;
    };
  }, [source]);
  return error ? (
    <p role="alert">{error}</p>
  ) : url ? (
    <img src={url} alt={alt} className={className} />
  ) : (
    <p role="status">Carregando comprovante…</p>
  );
}
