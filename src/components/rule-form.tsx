"use client";

import { Select } from "./select";
import { useActionState } from "react";
import { addRule, saveRule, type RuleState } from "@/app/actions";
import type { CategoryRow, RuleRow } from "@/db/queries";
import { WEEKDAY_SHORT } from "@/lib/dates";
import { btnPrimary, field, label } from "@/lib/ui";

type Props = {
  categories: CategoryRow[];
  today: string;
  /** Present when editing an existing rule. */
  rule?: RuleRow;
};

export function RuleForm({ categories, today, rule }: Props) {
  const [state, action, pending] = useActionState<RuleState, FormData>(rule ? saveRule : addRule, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <label className="flex flex-col gap-1.5">
        <span className={label}>Título</span>
        <input name="title" defaultValue={rule?.title} required maxLength={200} placeholder="Academia" className={field} />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={`${label} mb-1.5`}>Repetir em</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_SHORT.map((name, i) => (
            <label key={name} className="cursor-pointer">
              <input
                type="checkbox"
                name="weekdays"
                value={i}
                defaultChecked={rule?.weekdays.includes(i)}
                className="peer sr-only"
              />
              <span className="block rounded-xl border border-line py-2.5 text-center text-xs font-semibold transition peer-checked:border-fg peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:ring-2 peer-focus-visible:ring-fg">
                {name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className={label}>Categoria</span>
        <Select name="categoryId" defaultValue={rule?.categoryId ?? ""}>
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
          <span className={label}>Início</span>
          <input type="date" name="startDate" defaultValue={rule?.startDate ?? today} required className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Fim</span>
          <input type="date" name="endDate" defaultValue={rule?.endDate ?? ""} className={field} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={label}>Notas</span>
        <textarea name="notes" rows={3} defaultValue={rule?.notes ?? ""} className={field} />
      </label>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="active" defaultChecked={rule?.active ?? true} className="size-5 accent-[var(--fg)]" />
        Ativa
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl border border-fg px-4 py-3 text-sm">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Salvando..." : rule ? "Salvar" : "Criar rotina"}
        </button>
        {rule && state.savedAt && !pending && <span className="text-sm text-muted">Salvo.</span>}
      </div>
    </form>
  );
}
