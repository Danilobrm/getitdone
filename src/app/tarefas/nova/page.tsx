import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NewTaskForm } from "@/components/new-task-form";
import { listCategories } from "@/db/queries";
import { requireUserId } from "@/lib/auth";
import { isValidDay, todayLocal } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const userId = await requireUserId();
  const { d } = await searchParams;
  const today = todayLocal();
  // ?d=backlog opens the form with no day, so the task lands in the backlog.
  const backlog = d === "backlog";
  const day = backlog ? "" : isValidDay(d) ? d : today;
  const categories = await listCategories(userId);

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-28 pt-5">
      <Link href={backlog ? "/gerenciar?tab=backlog" : day === today ? "/" : `/?d=${day}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Cancelar
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-semibold tracking-tighter">Nova tarefa</h1>
      <NewTaskForm day={day} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </main>
  );
}
