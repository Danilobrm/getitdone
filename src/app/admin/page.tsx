import Link from "next/link";
import { listUsersWithTaskStats } from "@/db/admin-queries";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const users = await listUsersWithTaskStats();
  const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: env.tz });

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-16 pt-5">
      <Link href="/gerenciar" className="text-sm text-muted underline underline-offset-4">
        Voltar
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tighter">Admin</h1>

      <dl className="mt-6">
        <Stat label="Usuários" value={users.length} />
      </dl>

      <ul className="mt-8 flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id} className="rounded-2xl border border-line px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <p className="truncate font-semibold">{u.username}</p>
                {u.role === "admin" && <span className="shrink-0 text-xs font-medium text-muted">admin</span>}
              </div>
              <p className="shrink-0 text-xs text-muted">desde {dateFmt.format(u.createdAt)}</p>
            </div>
            <p className="mt-1 text-sm text-muted">
              {u.totalTasks} {u.totalTasks === 1 ? "tarefa" : "tarefas"} · {u.doneTasks}{" "}
              {u.doneTasks === 1 ? "completa" : "completas"}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line px-3 py-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tighter">{value}</dd>
    </div>
  );
}
