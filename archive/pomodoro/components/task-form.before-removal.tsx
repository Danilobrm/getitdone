"use client";

import { Select } from "./select";
import { useActionState } from "react";
import { saveTask, type UpdateTaskState } from "@/app/actions";
import type { CategoryRow, TaskDetail } from "@/db/queries";
import { btnPrimary, field, label } from "@/lib/ui";

export function TaskForm({ task, categories }: { task: TaskDetail; categories: CategoryRow[] }) {
  const [state, action, pending] = useActionState<UpdateTaskState, FormData>(saveTask, {});

  return (
    <form action={action} className="flex flex-col gap-5">
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
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Dia</span>
          <input type="date" name="date" defaultValue={task.date ?? ""} className={field} />
          <span className="text-xs text-muted">Vazio = backlog</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Pomodoros</span>
          <input
            type="number"
            name="estimatedPomodoros"
            min={1}
            max={99}
            defaultValue={task.estimatedPomodoros ?? ""}
            placeholder="Estimativa"
            className={field}
          />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl border border-fg px-4 py-3 text-sm">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {state.savedAt && !pending && <span className="text-sm text-muted">Salvo.</span>}
      </div>
    </form>
  );
}
