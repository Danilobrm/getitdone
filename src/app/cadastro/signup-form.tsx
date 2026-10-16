"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthState } from "@/app/login/actions";
import { btnPrimary, field } from "@/lib/ui";

export function SignupForm({ needsCode }: { needsCode: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, {});

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
        minLength={3}
        maxLength={30}
        className={field}
      />
      <input
        type="password"
        name="password"
        placeholder="Senha (mín. 8 caracteres)"
        autoComplete="new-password"
        required
        minLength={8}
        className={field}
      />
      {needsCode && <input name="code" placeholder="Código de convite" autoComplete="off" required className={field} />}
      {state.error && (
        <p role="alert" className="text-sm font-medium">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Criando..." : "Criar conta"}
      </button>
      <p className="mt-2 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-fg underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
