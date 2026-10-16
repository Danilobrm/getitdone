import { ArrowLeft, Check, Coffee, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ConfirmDelete } from "@/components/confirm-delete";
import { StartNowButton } from "@/components/start-now-button";
import { TaskForm } from "@/components/task-form";
import { TimerPanel } from "@/components/timer-panel";
import {
  countCompletedFocus,
  getLastSession,
  getOpenSession,
  getTask,
  listCategories,
  suggestBreak,
} from "@/db/queries";
import { requireUserId } from "@/lib/auth";
import { serverNowMs } from "@/lib/dates";
import { btnGhost, btnPrimary, label } from "@/lib/ui";
import { beginBreak, removeTask, toggleTask } from "../../actions";

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [task, categories, pomodoros, open, last] = await Promise.all([
    getTask(userId, id),
    listCategories(userId),
    countCompletedFocus(userId, id),
    getOpenSession(userId),
    getLastSession(userId),
  ]);
  if (!task) notFound();

  const done = task.status === "done";
  const back = task.date ? `/?d=${task.date}` : "/gerenciar";
  const showTimer = open && (open.taskId === task.id || open.taskId === null);
  const otherRunning = open && open.taskId !== null && open.taskId !== task.id ? open : null;
  const justFinishedFocus = !open && last?.kind === "focus" && last.completed && last.taskId === task.id;
  const suggestion = justFinishedFocus ? await suggestBreak(userId) : null;

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-28 pt-5">
      <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <h1 className="mt-4 break-words text-3xl font-semibold leading-tight tracking-tighter">{task.title}</h1>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line p-4">
          <dt className={label}>Tempo gasto</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{formatDuration(task.timeSpentSec)}</dd>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <dt className={label}>Pomodoros</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {pomodoros}
            {task.estimatedPomodoros ? <span className="text-muted"> / {task.estimatedPomodoros}</span> : null}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-3">
        {open && showTimer ? (
          <TimerPanel
            session={{
              id: open.id,
              kind: open.kind,
              startedAtMs: open.startedAt.getTime(),
              plannedSec: open.plannedSec,
              taskId: open.taskId,
              taskTitle: open.taskTitle,
            }}
            serverNowMs={serverNowMs()}
          />
        ) : (
          <>
            {suggestion && (
              <div className="rounded-2xl border border-fg p-4">
                <p className="font-semibold">Foco concluído.</p>
                <p className="mt-1 text-sm text-muted">
                  {suggestion.done} {suggestion.done === 1 ? "pomodoro feito" : "pomodoros feitos"} hoje. Pausa{" "}
                  {suggestion.kind === "long_break" ? "longa" : "curta"} sugerida ({Math.round(suggestion.sec / 60)} min).
                </p>
                <form action={beginBreak} className="mt-3">
                  <input type="hidden" name="kind" value={suggestion.kind} />
                  <button type="submit" className={btnGhost}>
                    <Coffee size={16} /> Iniciar pausa
                  </button>
                </form>
              </div>
            )}
            <StartNowButton taskId={task.id} label={task.status === "doing" ? "Novo pomodoro" : "Fazer agora"} />
            {otherRunning && (
              <p className="text-center text-xs text-muted">
                Isso interrompe o pomodoro em andamento de “{otherRunning.taskTitle}”.
              </p>
            )}
          </>
        )}

        <form action={toggleTask}>
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="done" value={String(!done)} />
          <button type="submit" className={`${done ? btnGhost : btnPrimary} w-full`}>
            {done ? <RotateCcw size={16} /> : <Check size={16} />}
            {done ? "Reabrir tarefa" : "Concluir tarefa"}
          </button>
        </form>
      </div>

      <h2 className={`${label} mt-10`}>Detalhes</h2>
      <div className="mt-3">
        <TaskForm task={task} categories={categories} />
      </div>

      <div className="mt-10">
        <ConfirmDelete
          action={removeTask}
          id={task.id}
          label="Excluir tarefa"
          warning="Excluir esta tarefa? As sessões de pomodoro ligadas a ela perdem o vínculo com a tarefa. Não dá para desfazer."
        />
      </div>
    </main>
  );
}
