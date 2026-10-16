import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { RuleForm } from "@/components/rule-form";
import { getRule, listCategories } from "@/db/queries";
import { requireUserId } from "@/lib/auth";
import { todayLocal } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function EditRulePage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [rule, categories] = await Promise.all([getRule(userId, id), listCategories(userId)]);
  if (!rule) notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-28 pt-5">
      <Link href="/gerenciar?tab=rotinas" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Voltar
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-semibold tracking-tighter">Editar rotina</h1>
      <RuleForm key={JSON.stringify(rule)} rule={rule} categories={categories} today={todayLocal()} />
    </main>
  );
}
