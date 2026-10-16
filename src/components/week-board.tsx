"use client";

import { Check, Repeat2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { moveTask, toggleTask } from "@/app/actions";
import type { TaskWithCategory } from "@/db/queries";
import { WEEKDAY_SHORT } from "@/lib/dates";

export type BoardDay = { day: string; weekday: number; dayOfMonth: string; tasks: TaskWithCategory[] };

export function WeekBoard({ days, today }: { days: BoardDay[]; today: string }) {
  const [overDay, setOverDay] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(id: string, day: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("day", day);
    startTransition(() => moveTask(fd));
  }

  return (
    <div className={`grid gap-3 md:grid-cols-7 ${pending ? "opacity-60 transition-opacity" : ""}`}>
      {days.map((d) => {
        const done = d.tasks.filter((t) => t.status === "done").length;
        const isToday = d.day === today;
        return (
          <section
            key={d.day}
            onDragOver={(e) => {
              e.preventDefault();
              setOverDay(d.day);
            }}
            onDragLeave={() => setOverDay((cur) => (cur === d.day ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              setOverDay(null);
              const id = e.dataTransfer.getData("text/task-id");
              if (id) move(id, d.day);
            }}
            className={`flex min-h-24 flex-col rounded-2xl border p-3 transition ${
              overDay === d.day ? "border-fg bg-soft" : isToday ? "border-fg" : "border-line"
            }`}
          >
            <header className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {WEEKDAY_SHORT[d.weekday]} <span className="text-muted">{d.dayOfMonth}</span>
              </h2>
              <span className="text-xs tabular-nums text-muted">
                {done}/{d.tasks.length}
              </span>
            </header>
            <ul className="mt-2 flex flex-col gap-2">
              {d.tasks.map((t) => (
                <li
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                  className="rounded-xl border border-line bg-bg p-2.5 md:cursor-grab"
                >
                  <div className="flex items-start gap-2">
                    <form action={toggleTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="done" value={String(t.status !== "done")} />
                      <button
                        type="submit"
                        role="checkbox"
                        aria-checked={t.status === "done"}
                        aria-label={t.status === "done" ? "Marcar como não feita" : "Marcar como feita"}
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                          t.status === "done" ? "border-fg bg-fg text-bg" : "border-muted"
                        }`}
                      >
                        {t.status === "done" && <Check size={11} strokeWidth={3.5} />}
                      </button>
                    </form>
                    <Link
                      href={`/tarefas/${t.id}`}
                      className={`min-w-0 flex-1 break-words text-sm leading-snug ${
                        t.status === "done" ? "text-muted line-through" : ""
                      }`}
                    >
                      {t.title}
                    </Link>
                    {t.recurringRuleId && <Repeat2 size={13} className="mt-0.5 shrink-0 text-muted" aria-label="Rotina" />}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
