import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-xs flex-col gap-6">
        <h1 className="text-lg font-medium">Sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
