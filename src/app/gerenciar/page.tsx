import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { AddTaskFab } from "@/components/add-task-fab";
import { Backlog } from "@/components/backlog";
import { CategoryList } from "@/components/category-list";
import { ConfirmDelete } from "@/components/confirm-delete";
import { NewCategoryForm } from "@/components/new-category-form";
import { RuleForm } from "@/components/rule-form";
import { getUser, listBacklog, listCategories, listRules } from "@/db/queries";
import { requireUserId } from "@/lib/auth";
import { WEEKDAY_SHORT, todayLocal } from "@/lib/dates";
import { logout } from "../login/actions";
import { removeRule } from "../actions";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "rotinas", text: "Rotinas" },
  { id: "backlog", text: "Backlog" },
  { id: "categorias", text: "Categorias" },
] as const;

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const userId = await requireUserId();
  const user = await getUser(userId);
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.id === tab)?.id ?? "rotinas";

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-28 pt-5">
      <h1 className="text-3xl font-semibold tracking-tighter">Gerenciar</h1>

      <nav className="mt-5 flex gap-6 border-b border-line text-sm">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/gerenciar?tab=${t.id}`}
            className={`-mb-px border-b-2 pb-3 font-medium ${
              active === t.id ? "border-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.text}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {active === "backlog" && <BacklogTab userId={userId} />}
        {active === "rotinas" && <Routines userId={userId} />}
        {active === "categorias" && <Categories userId={userId} />}
      </div>

      <footer className="mt-14 flex items-center justify-center gap-3 text-sm text-muted">
        {user && <span>Conectado como {user.username}</span>}
        {user?.role === "admin" && (
          <>
            <span aria-hidden>·</span>
            <Link href="/admin" className="font-medium text-fg underline underline-offset-4">
              Admin
            </Link>
          </>
        )}
        <span aria-hidden>·</span>
        <form action={logout}>
          <button type="submit" className="font-medium text-fg underline underline-offset-4">
            Sair
          </button>
        </form>
      </footer>
    </main>
  );
}

async function BacklogTab({ userId }: { userId: string }) {
  const tasks = await listBacklog(userId);
  return (
    <section className="pb-20">
      <Backlog tasks={tasks} />
      <AddTaskFab href="/tarefas/nova?d=backlog" />
    </section>
  );
}

async function Routines({ userId }: { userId: string }) {
  const [rules, categories] = await Promise.all([listRules(userId), listCategories(userId)]);
  const today = todayLocal();
  return (
    <section className="flex flex-col gap-4">
      <Link
        href="/gerenciar/rotinas/nova"
        className="flex items-center rounded-2xl border border-fg px-4 py-3.5 text-sm font-semibold"
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={16} /> Nova rotina
        </span>
      </Link>

      {rules.length === 0 && <p className="text-muted">Nenhuma rotina ainda.</p>}

      <ul className="flex flex-col gap-3">
        {rules.map((r) => (
          <li key={r.id}>
            <details className="group rounded-2xl border border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className={`truncate font-semibold ${r.active ? "" : "text-muted line-through"}`}>{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {r.weekdays.map((d) => WEEKDAY_SHORT[d]).join(" · ")}
                    {!r.active && " · pausada"}
                  </p>
                </div>
                <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-4 border-t border-line p-4">
                <RuleForm key={JSON.stringify(r)} rule={r} categories={categories} today={today} />
                <ConfirmDelete
                  action={removeRule}
                  id={r.id}
                  label="Excluir rotina"
                  warning="Excluir a rotina? As tarefas já geradas continuam, mas nada novo será criado."
                />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Categories({ userId }: { userId: string }) {
  const categories = await listCategories(userId);
  return (
    <section className="flex flex-col gap-6">
      <NewCategoryForm />
      {categories.length === 0 && <p className="text-muted">Nenhuma categoria ainda.</p>}
      <CategoryList categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </section>
  );
}
