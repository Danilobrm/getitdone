import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <h1 className="text-4xl font-semibold tracking-tighter">getitdone</h1>
      <LoginForm />
    </main>
  );
}
