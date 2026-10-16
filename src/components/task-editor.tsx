"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { removeTask, saveTask, type UpdateTaskState } from "@/app/actions";
import type { CategoryRow, TaskDetail } from "@/db/queries";
import { btnPrimary, field, iconBtn, label } from "@/lib/ui";
import { ConfirmModal } from "./confirm-modal";
import { Select } from "./select";

type Props = {
  task: TaskDetail;
  categories: CategoryRow[];
  backHref: string;
  /** Server-rendered content shown between the header and the fields (title, complete button). */
  children?: ReactNode;
};

export function TaskEditor({ task, categories, backHref, children }: Props) {
  const [state, action, pending] = useActionState<UpdateTaskState, FormData>(saveTask, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <span role="status" className="text-sm text-muted">
          {pending ? "Salvando..." : state.savedAt ? "Salvo." : ""}
        </span>
      </header>

      {children}

      <form action={action} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="id" value={task.id} />
        <label className="flex flex-col gap-1.5">
          <span className={label}>Título</span>
          <input name="title" defaultValue={task.title} required maxLength={200} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Notas</span>
          <textarea
            name="notes"
            defaultValue={task.notes ?? ""}
            rows={6}
            className={field}
            placeholder="Markdown simples, links de material"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Categoria</span>
          <Select name="categoryId" defaultValue={task.categoryId ?? ""}>
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Dia</span>
          <input type="date" name="date" defaultValue={task.date ?? ""} className={field} />
          <span className="text-xs text-muted">Vazio = backlog</span>
        </label>
        {state.error && (
          <p role="alert" className="rounded-xl border border-fg px-4 py-3 text-sm">
            {state.error}
          </p>
        )}
        <div className="flex items-stretch gap-2 pt-2">
          <button type="submit" disabled={pending} className={`${btnPrimary} flex-1`}>
            Salvar
          </button>
          <button
            type="button"
            aria-label="Excluir tarefa"
            title="Excluir tarefa"
            onClick={() => setConfirming(true)}
            className={`${iconBtn} size-auto w-12`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </form>

      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Excluir tarefa?"
        description="Esta tarefa será apagada e não dá para desfazer."
        confirmLabel="Excluir"
        action={removeTask}
        id={task.id}
      />
    </>
  );
}
