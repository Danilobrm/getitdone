"use client";

import { completeSession, interruptSession } from "@/app/actions";
import { btnGhost, btnPrimary } from "@/lib/ui";
import { KIND_LABEL, useSessionTimer, type SessionDTO } from "./use-session-timer";

export function TimerPanel({ session, serverNowMs }: { session: SessionDTO; serverNowMs: number }) {
  const { clock, expired, progress } = useSessionTimer(session, serverNowMs);
  const isFocus = session.kind === "focus";

  return (
    <section className="rounded-3xl border border-fg p-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{KIND_LABEL[session.kind]}</p>
      <p className="mt-3 font-mono text-7xl font-light tabular-nums tracking-tight" aria-live="off">
        {clock}
      </p>
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-fg" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
      </div>
      {expired && (
        <p className="mt-4 text-sm font-medium">{isFocus ? "Foco terminou." : "Pausa terminou."}</p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <form action={interruptSession}>
          <button type="submit" className={`${btnGhost} w-full`}>
            Interromper
          </button>
        </form>
        <form action={completeSession}>
          <button type="submit" disabled={!expired} className={`${btnPrimary} w-full`}>
            Concluir sessão
          </button>
        </form>
      </div>
    </section>
  );
}
