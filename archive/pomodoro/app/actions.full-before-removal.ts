"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { z } from "zod";
import {
  completeOpenSession,
  createCategory,
  createRule,
  createTask,
  deleteCategory,
  deleteRule,
  deleteTask,
  getTask,
  interruptOpenSession,
  moveTasksToDay,
  reorderCategories,
  setTaskDone,
  startBreak,
  startFocus,
  updateCategory,
  updateRule,
  updateSettings,
  updateTask,
} from "@/db/queries";
import { todayLocal } from "@/lib/dates";

const toggleSchema = z.object({ id: z.uuid(), done: z.stringbool() });

export async function toggleTask(formData: FormData) {
  const userId = await requireUserId();
  const parsed = toggleSchema.safeParse({ id: formData.get("id"), done: formData.get("done") });
  if (!parsed.success) return;
  await setTaskDone(userId, parsed.data.id, parsed.data.done);
  revalidatePath("/", "layout");
}

const bringSchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });

export async function bringToToday(formData: FormData) {
  const userId = await requireUserId();
  const parsed = bringSchema.safeParse({ ids: formData.getAll("id") });
  if (!parsed.success) return;
  await moveTasksToDay(userId, parsed.data.ids, todayLocal());
  revalidatePath("/", "layout");
}

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const updateTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "Informe um título.").max(200),
  notes: z.preprocess(emptyToNull, z.string().max(10_000).nullable()),
  categoryId: z.preprocess(emptyToNull, z.uuid().nullable()),
  date: z.preprocess(emptyToNull, z.iso.date().nullable()),
  estimatedPomodoros: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(99).nullable()),
});

export type UpdateTaskState = { error?: string; savedAt?: number };

export async function saveTask(_prev: UpdateTaskState, formData: FormData): Promise<UpdateTaskState> {
  const userId = await requireUserId();
  const parsed = updateTaskSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    notes: formData.get("notes"),
    categoryId: formData.get("categoryId"),
    date: formData.get("date"),
    estimatedPomodoros: formData.get("estimatedPomodoros"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const { id, ...input } = parsed.data;
  const result = await updateTask(userId, id, input);
  if (result === "duplicate_routine") return { error: "Essa rotina já tem uma tarefa nesse dia." };
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

const idSchema = z.object({ id: z.uuid() });

export async function removeTask(formData: FormData) {
  const userId = await requireUserId();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  const task = await getTask(userId, parsed.data.id);
  await deleteTask(userId, parsed.data.id);
  revalidatePath("/", "layout");
  redirect(task?.date ? `/?d=${task.date}` : "/");
}

const categorySchema = z.object({ name: z.string().trim().min(1, "Informe um nome.").max(40) });

export type CategoryState = { error?: string; savedAt?: number };

export async function addCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  const userId = await requireUserId();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await createCategory(userId, parsed.data);
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

export async function saveCategory(formData: FormData) {
  const userId = await requireUserId();
  const parsed = categorySchema
    .extend({ id: z.uuid() })
    .safeParse({ id: formData.get("id"), name: formData.get("name") });
  if (!parsed.success) return;
  const { id, ...input } = parsed.data;
  await updateCategory(userId, id, input);
  revalidatePath("/", "layout");
}

export async function removeCategory(formData: FormData) {
  const userId = await requireUserId();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  await deleteCategory(userId, parsed.data.id);
  revalidatePath("/", "layout");
}

const reorderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200) });

export async function reorderCategoriesAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = reorderSchema.safeParse({ ids: formData.getAll("id") });
  if (!parsed.success) return;
  await reorderCategories(userId, parsed.data.ids);
  revalidatePath("/", "layout");
}

// ---------- pomodoro ----------

export async function startNow(formData: FormData) {
  const userId = await requireUserId();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  await startFocus(userId, parsed.data.id);
  revalidatePath("/", "layout");
}

export async function interruptSession() {
  const userId = await requireUserId();
  await interruptOpenSession(userId);
  revalidatePath("/", "layout");
}

export async function completeSession() {
  const userId = await requireUserId();
  await completeOpenSession(userId);
  revalidatePath("/", "layout");
}

const breakSchema = z.object({ kind: z.enum(["short_break", "long_break"]) });

export async function beginBreak(formData: FormData) {
  const userId = await requireUserId();
  const parsed = breakSchema.safeParse({ kind: formData.get("kind") });
  if (!parsed.success) return;
  await startBreak(userId, parsed.data.kind);
  revalidatePath("/", "layout");
}

const minutes = (min: number, max: number) =>
  z.coerce
    .number()
    .int()
    .min(min)
    .max(max)
    .transform((m) => m);

const settingsSchema = z.object({
  focusMin: minutes(1, 180),
  shortBreakMin: minutes(1, 60),
  longBreakMin: minutes(1, 120),
  pomodorosUntilLongBreak: minutes(2, 12),
});

export type SettingsState = { error?: string; savedAt?: number };

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const userId = await requireUserId();
  const parsed = settingsSchema.safeParse({
    focusMin: formData.get("focusMin"),
    shortBreakMin: formData.get("shortBreakMin"),
    longBreakMin: formData.get("longBreakMin"),
    pomodorosUntilLongBreak: formData.get("pomodorosUntilLongBreak"),
  });
  if (!parsed.success) return { error: "Valores fora do limite permitido." };
  const d = parsed.data;
  await updateSettings(userId, {
    focusSec: d.focusMin * 60,
    shortBreakSec: d.shortBreakMin * 60,
    longBreakSec: d.longBreakMin * 60,
    pomodorosUntilLongBreak: d.pomodorosUntilLongBreak,
  });
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

// ---------- recurring rules ----------

const ruleSchema = z
  .object({
    title: z.string().trim().min(1, "Informe um título.").max(200),
    notes: z.preprocess(emptyToNull, z.string().max(10_000).nullable()),
    categoryId: z.preprocess(emptyToNull, z.uuid().nullable()),
    estimatedPomodoros: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(99).nullable()),
    weekdays: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, "Escolha ao menos um dia da semana.")
      .transform((days) => [...new Set(days)].sort()),
    startDate: z.iso.date("Informe a data de início."),
    endDate: z.preprocess(emptyToNull, z.iso.date().nullable()),
    active: z.boolean(),
  })
  .refine((r) => !r.endDate || r.endDate >= r.startDate, {
    message: "O fim não pode ser antes do início.",
    path: ["endDate"],
  });

export type RuleState = { error?: string; savedAt?: number };

function parseRule(formData: FormData) {
  return ruleSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    categoryId: formData.get("categoryId"),
    estimatedPomodoros: formData.get("estimatedPomodoros"),
    weekdays: formData.getAll("weekdays"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    active: formData.get("active") === "on",
  });
}

export async function addRule(_prev: RuleState, formData: FormData): Promise<RuleState> {
  const userId = await requireUserId();
  const parsed = parseRule(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await createRule(userId, parsed.data);
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

export async function saveRule(_prev: RuleState, formData: FormData): Promise<RuleState> {
  const userId = await requireUserId();
  const idParsed = idSchema.safeParse({ id: formData.get("id") });
  if (!idParsed.success) return { error: "Rotina inválida." };
  const parsed = parseRule(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await updateRule(userId, idParsed.data.id, parsed.data);
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

export async function removeRule(formData: FormData) {
  const userId = await requireUserId();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  await deleteRule(userId, parsed.data.id);
  revalidatePath("/", "layout");
}

// ---------- week & backlog ----------

const moveSchema = z.object({ id: z.uuid(), day: z.iso.date() });

/** Used by drag & drop, "mover para" and "agendar". */
export async function moveTask(formData: FormData) {
  const userId = await requireUserId();
  const parsed = moveSchema.safeParse({ id: formData.get("id"), day: formData.get("day") });
  if (!parsed.success) return;
  await moveTasksToDay(userId, [parsed.data.id], parsed.data.day);
  revalidatePath("/", "layout");
}

// ---------- new task page ----------

const newTaskSchema = z.object({
  title: z.string().trim().min(1, "Informe um título.").max(200),
  notes: z.preprocess(emptyToNull, z.string().max(10_000).nullable()),
  categoryId: z.preprocess(emptyToNull, z.uuid().nullable()),
  date: z.preprocess(emptyToNull, z.iso.date().nullable()),
  estimatedPomodoros: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(99).nullable()),
});

export type NewTaskState = { error?: string };

export async function createTaskAndReturn(_prev: NewTaskState, formData: FormData): Promise<NewTaskState> {
  const userId = await requireUserId();
  const parsed = newTaskSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    categoryId: formData.get("categoryId"),
    date: formData.get("date"),
    estimatedPomodoros: formData.get("estimatedPomodoros"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  await createTask(userId, parsed.data);
  revalidatePath("/", "layout");
  redirect(parsed.data.date ? `/?d=${parsed.data.date}` : "/gerenciar?tab=backlog");
}
