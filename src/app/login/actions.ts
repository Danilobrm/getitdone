"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { findUserByUsername, registerUser } from "@/db/queries";
import { env } from "@/lib/env";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, createSessionToken } from "@/lib/session";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,30}$/, "Usuário: 3 a 30 caracteres, só letras, números, ponto, hífen e sublinhado.");

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(30),
  password: z.string().min(1).max(200),
});

export type AuthState = { error?: string };

async function startSession(userId: string) {
  const token = await createSessionToken(env.sessionSecret, userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return { error: "Informe usuário e senha." };

  const user = await findUserByUsername(parsed.data.username);
  const ok =
    user?.passwordHash ? await verifyPassword(parsed.data.password, user.passwordHash) : await verifyAgainstDummy(parsed.data.password);
  if (!user || !ok) return { error: "Usuário ou senha incorretos." };

  await startSession(user.id);
  redirect("/");
}

const signupSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(200),
  code: z.string().max(200).default(""),
});

function codeMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    code: formData.get("code") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const required = env.signupCode;
  if (required) {
    if (!codeMatches(parsed.data.code, required)) return { error: "Código de convite inválido." };
  } else if (process.env.NODE_ENV === "production") {
    return { error: "Cadastro fechado." };
  }

  const userId = await registerUser(parsed.data.username, await hashPassword(parsed.data.password));
  if (!userId) return { error: "Esse nome de usuário já existe." };

  await startSession(userId);
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
