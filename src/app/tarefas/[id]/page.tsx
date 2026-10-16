import { Check, RotateCcw } from "lucide-react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TaskEditor } from "@/components/task-editor";
import { getTask, listCategories } from "@/db/queries";
import { requireUserId } from "@/lib/auth";
import { btnGhost, btnPrimary } from "@/lib/ui";
import { toggleTask } from "../../actions";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [task, categories] = await Promise.all([getTask(userId, id), listCategories(userId)]);
  if (!task) notFound();

  const done = task.status === "done";
  // Backlog tasks (no day) have no complete button at all; a done one can always be reopened.
  const canComplete = done || task.date !== null;
  const back = task.date ? `/?d=${task.date}` : "/gerenciar?tab=backlog";

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-28 pt-5">
      <TaskEditor task={task} categories={categories} backHref={back}>
        <h1 className="mt-4 break-words text-3xl font-semibold leading-tight tracking-tighter">{task.title}</h1>

        {canComplete && (
          <form action={toggleTask} className="mt-5">
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="done" value={String(!done)} />
            <button type="submit" className={`${done ? btnGhost : btnPrimary} w-full py-4 text-base`}>
              {done ? <RotateCcw size={16} /> : <Check size={16} />}
              {done ? "Reabrir tarefa" : "Concluir tarefa"}
            </button>
          </form>
        )}
      </TaskEditor>
    </main>
  );
}
