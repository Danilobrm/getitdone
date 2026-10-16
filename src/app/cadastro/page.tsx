import { env } from "@/lib/env";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const needsCode = env.signupCode !== null;
  const closed = !needsCode && process.env.NODE_ENV === "production";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <h1 className="text-4xl font-semibold tracking-tighter">Criar conta</h1>
      {closed ? (
        <p className="max-w-xs text-center text-muted">O cadastro está fechado neste ambiente.</p>
      ) : (
        <SignupForm needsCode={needsCode} />
      )}
    </main>
  );
}
