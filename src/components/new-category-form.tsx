"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { addCategory, type CategoryState } from "@/app/actions";
import { field } from "@/lib/ui";

export function NewCategoryForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CategoryState, FormData>(addCategory, {});

  useEffect(() => {
    if (state.savedAt) ref.current?.reset();
  }, [state.savedAt]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input name="name" placeholder="Nova categoria" required maxLength={40} autoComplete="off" className={`${field} min-w-0 flex-1`} />
        <button
          type="submit"
          disabled={pending}
          aria-label="Adicionar categoria"
          className="grid size-[50px] shrink-0 place-items-center rounded-xl bg-fg text-bg transition active:scale-95 disabled:opacity-40"
        >
          <Plus size={22} />
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium">
          {state.error}
        </p>
      )}
    </form>
  );
}
