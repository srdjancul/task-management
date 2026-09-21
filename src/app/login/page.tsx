import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="glass flex w-full max-w-xs flex-col gap-6 rounded-xl p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Sign in</h1>
          <p className="text-neutral-tertiary">
            Outreach CRM &amp; daily planner
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
