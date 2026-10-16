"use client";

import { ChevronDown } from "lucide-react";
import { useActionState } from "react";
import { createTaskAndReturn, type NewTaskState } from "@/app/actions";
import { btnPrimary, field, label } from "@/lib/ui";
import { Select } from "./select";

type Props = {
  day: string;
  categories: { id: string; name: string }[];
};

export function NewTaskForm({ day, categories }: Props) {
  const [state, action, pending] = useActionState<NewTaskState, FormData>(createTaskAndReturn, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      <input
        name="title"
        placeholder="O que precisa ser feito?"
        aria-label="Título"
        maxLength={200}
        autoComplete="off"
        autoFocus
        required
        className="w-full border-0 border-b border-line bg-transparent pb-3 text-2xl font-semibold tracking-tight outline-none placeholder:text-muted focus:border-fg"
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Dia</span>
          <input type="date" name="date" defaultValue={day} className={field} />
        </label>
        {categories.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className={label}>Categoria</span>
            <Select name="categoryId" defaultValue="">
              <option value="">Nenhuma</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
      <p className="-mt-3 text-xs text-muted">Deixe o dia vazio para mandar para o backlog.</p>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
          Mais opções
          <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Notas</span>
            <textarea name="notes" rows={4} placeholder="Markdown simples, links de material" className={field} />
          </label>
        </div>
      </details>

      {state.error && (
        <p role="alert" className="rounded-xl border border-fg px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-4 text-base`}>
        {pending ? "Criando..." : "Criar tarefa"}
      </button>
    </form>
  );
}
