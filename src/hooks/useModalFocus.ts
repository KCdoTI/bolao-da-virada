import { useEffect, useRef } from "react";
export function useModalFocus(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) return;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      ).filter((e) => e.getClientRects().length);
    const top = () => {
      const list = document.querySelectorAll('[role="dialog"]');
      return list[list.length - 1] === dialog;
    };
    const timer = setTimeout(() => focusable()[0]?.focus(), 0);
    const key = (e: KeyboardEvent) => {
      if (!top()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      }
      if (e.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            !dialog.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !dialog.contains(document.activeElement))
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const focus = (e: FocusEvent) => {
      if (top() && !dialog.contains(e.target as Node)) focusable()[0]?.focus();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", focus);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", key);
      document.removeEventListener("focusin", focus);
      before?.focus();
    };
  }, [open]);
}
