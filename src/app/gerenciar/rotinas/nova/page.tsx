import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RuleForm } from "@/components/rule-form";
import { listCategories } from "@/db/queries";
import { requireUserId } from "@/lib/auth";
import { todayLocal } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function NewRulePage() {
  const userId = await requireUserId();
  const categories = await listCategories(userId);

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-28 pt-5">
      <Link href="/gerenciar?tab=rotinas" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Cancelar
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-semibold tracking-tighter">Nova rotina</h1>
      <RuleForm categories={categories} today={todayLocal()} />
    </main>
  );
}
