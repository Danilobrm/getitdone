"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsState } from "@/app/actions";
import type { SettingsRow } from "@/db/queries";
import { btnPrimary, field, label } from "@/lib/ui";

export function SettingsForm({ settings }: { settings: SettingsRow }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  const items = [
    { name: "focusMin", text: "Foco (min)", value: settings.focusSec / 60, min: 1, max: 180 },
    { name: "shortBreakMin", text: "Pausa curta (min)", value: settings.shortBreakSec / 60, min: 1, max: 60 },
    { name: "longBreakMin", text: "Pausa longa (min)", value: settings.longBreakSec / 60, min: 1, max: 120 },
    { name: "pomodorosUntilLongBreak", text: "Pomodoros até a pausa longa", value: settings.pomodorosUntilLongBreak, min: 2, max: 12 },
  ];

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {items.map((i) => (
          <label key={i.name} className="flex flex-col gap-1.5">
            <span className={label}>{i.text}</span>
            <input type="number" name={i.name} defaultValue={i.value} min={i.min} max={i.max} required className={field} />
          </label>
        ))}
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
      <p className="text-xs text-muted">A nova duração vale a partir da próxima sessão.</p>
    </form>
  );
}
