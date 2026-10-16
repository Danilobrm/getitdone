"use client";

import { useEffect, useRef } from "react";
import { btnGhost, btnPrimary } from "@/lib/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Server action run on confirm, with the hidden `id` field below. */
  action: (formData: FormData) => void | Promise<void>;
  id: string;
};

/** Confirmation modal on the native <dialog>: Esc closes, focus is trapped, the page behind is inert. */
export function ConfirmModal({ open, onClose, title, description, confirmLabel, action, id }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-modal-title"
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself, not on its content.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-3xl border border-line bg-bg p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <form action={action} className="flex flex-col gap-5 p-6">
        <input type="hidden" name="id" value={id} />
        <div>
          <h2 id="confirm-modal-title" className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted">{description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} autoFocus className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
