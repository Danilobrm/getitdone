"use client";

import Link from "next/link";
import { KIND_LABEL, useSessionTimer, type SessionDTO } from "./use-session-timer";

function RunningCard({ session, serverNowMs }: { session: SessionDTO; serverNowMs: number }) {
  const { clock, expired } = useSessionTimer(session, serverNowMs);
  const body = (
    <>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-60">
          {KIND_LABEL[session.kind]}
          {expired && " · terminou"}
        </p>
        <p className="mt-0.5 truncate font-medium">{session.taskTitle ?? "Descanse um pouco"}</p>
      </div>
      <span className="font-mono text-2xl tabular-nums">{clock}</span>
    </>
  );
  const cls = "flex items-center justify-between gap-4 rounded-2xl bg-fg px-4 py-3 text-bg";
  return session.taskId ? (
    <Link href={`/tarefas/${session.taskId}`} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

type Props = {
  session: SessionDTO | null;
  doing: { id: string; title: string } | null;
  serverNowMs: number;
};

/** Pinned card on top of "Hoje": running pomodoro with time left, or the doing task. */
export function ActiveCard({ session, doing, serverNowMs }: Props) {
  if (!session && !doing) return null;
  return (
    <div className="sticky top-3 z-10 mt-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]">
      {session ? (
        <RunningCard session={session} serverNowMs={serverNowMs} />
      ) : (
        doing && (
          <Link
            href={`/tarefas/${doing.id}`}
            className="block rounded-2xl bg-fg px-4 py-3 text-bg"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-60">Fazendo agora</p>
            <p className="mt-0.5 truncate font-medium">{doing.title}</p>
          </Link>
        )
      )}
    </div>
  );
}
