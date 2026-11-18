import React, { useEffect, useRef } from "react";
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current!;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      className="app-dialog"
    >
      <header className="flex justify-between items-center gap-4 mb-5">
        <h2 className="text-xl font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="btn"
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
