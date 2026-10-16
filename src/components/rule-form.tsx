"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { addRule, removeRule, saveRule, type RuleState } from "@/app/actions";
import type { CategoryRow, RuleRow } from "@/db/queries";
import { WEEKDAY_SHORT } from "@/lib/dates";
import { btnPrimary, field, iconBtn, label } from "@/lib/ui";
import { ConfirmModal } from "./confirm-modal";
import { Select } from "./select";

type Props = {
  categories: CategoryRow[];
  today: string;
  /** Present when editing an existing rule. */
  rule?: RuleRow;
};

export function RuleForm({ categories, today, rule }: Props) {
  const [state, action, pending] = useActionState<RuleState, FormData>(rule ? saveRule : addRule, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <>
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
      <div className="flex items-stretch gap-2 pt-2">
        <button type="submit" disabled={pending} className={`${btnPrimary} flex-1`}>
          {rule ? "Salvar" : pending ? "Salvando..." : "Criar rotina"}
        </button>
        {rule && (
          <button
            type="button"
            aria-label="Excluir rotina"
            title="Excluir rotina"
            onClick={() => setConfirming(true)}
            className={`${iconBtn} size-auto w-12`}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {rule && state.savedAt && !pending && <p className="text-sm text-muted">Salvo.</p>}
    </form>
    {rule && (
      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Excluir rotina?"
        description="As tarefas já geradas continuam, mas nada novo será criado."
        confirmLabel="Excluir"
        action={removeRule}
        id={rule.id}
      />
    )}
    </>
  );
}
