"use client";

import Link from "next/link";
import { useActionState } from "react";
import { btnPrimary, field } from "@/lib/ui";
import { login, type AuthState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <form action={action} className="flex w-full max-w-xs flex-col gap-3">
      <input
        name="username"
        placeholder="Usuário"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        autoFocus
        required
        className={field}
      />
      <input type="password" name="password" placeholder="Senha" autoComplete="current-password" required className={field} />
      {state.error && (
        <p role="alert" className="text-sm font-medium">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
      <p className="mt-2 text-center text-sm text-muted">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-fg underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
