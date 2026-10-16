import Link from "next/link";
import { ActiveCard } from "@/components/active-card";
import { AddTaskFab } from "@/components/add-task-fab";
import { DayNav } from "@/components/day-nav";
import { Overdue } from "@/components/overdue";
import { TaskRow } from "@/components/task-row";
import {
  ensureRecurringForDay,
  getDoingTask,
  getOpenSession,
  listOverdue,
  listTasksForDay,
  type TaskWithCategory,
} from "@/db/queries";
import { requireUserId } from "@/lib/auth";
import { isValidDay, serverNowMs, todayLocal } from "@/lib/dates";
import { label } from "@/lib/ui";

type Group = { key: string; name: string | null; sort: number; tasks: TaskWithCategory[] };

function groupByCategory(tasks: TaskWithCategory[]): Group[] {
  const map = new Map<string, Group>();
  for (const t of tasks) {
    const key = t.categoryId ?? "none";
    let g = map.get(key);
    if (!g) {
      g = { key, name: t.categoryName, sort: t.categorySort ?? Number.MAX_SAFE_INTEGER, tasks: [] };
      map.set(key, g);
    }
    g.tasks.push(t);
  }
  return [...map.values()].sort((a, b) => a.sort - b.sort);
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const userId = await requireUserId();
  const { d } = await searchParams;
  const today = todayLocal();
  const day = isValidDay(d) ? d : today;
  const isToday = day === today;

  // Opening a day materializes its routine tasks (idempotent).
  await ensureRecurringForDay(userId, day);

  const [tasks, doing, session, overdue] = await Promise.all([
    listTasksForDay(userId, day),
    getDoingTask(userId),
    getOpenSession(userId),
    isToday ? listOverdue(userId, today) : Promise.resolve([]),
  ]);

  const pending = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  // Category headings only help when there is more than one bucket.
  const groups = groupByCategory(pending);
  const showHeadings = groups.length > 1 || groups.some((g) => g.name);

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-36 pt-5">
      <DayNav day={day} today={today} />

      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span className="tabular-nums">
          {tasks.length === 0 ? "Sem tarefas" : `${done.length} de ${tasks.length} feitas`}
        </span>
        {!isToday && (
          <Link href="/" className="font-semibold text-fg underline underline-offset-4">
            Hoje
          </Link>
        )}
      </div>

      <ActiveCard
        session={
          session && {
            id: session.id,
            kind: session.kind,
            startedAtMs: session.startedAt.getTime(),
            plannedSec: session.plannedSec,
            taskId: session.taskId,
            taskTitle: session.taskTitle,
          }
        }
        doing={doing}
        serverNowMs={serverNowMs()}
      />

      <Overdue tasks={overdue} />

      {tasks.length === 0 ? (
        <div className="mt-24 text-center">
          <p className="text-lg font-medium">Dia livre.</p>
          <p className="mt-1 text-sm text-muted">Toque em + para adicionar uma tarefa.</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.key}>
              {showHeadings && <h2 className={`${label} mb-1`}>{g.name ?? "Sem categoria"}</h2>}
              <ul>
                {g.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </ul>
            </section>
          ))}

          {done.length > 0 && (
            <section>
              <h2 className={`${label} mb-1`}>Feitas</h2>
              <ul>
                {done.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <AddTaskFab href={isToday ? "/tarefas/nova" : `/tarefas/nova?d=${day}`} />
    </main>
  );
}
