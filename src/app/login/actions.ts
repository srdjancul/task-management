"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// email is returned so the form can keep it after a failed attempt
// (React resets action-driven forms); the password is never echoed back.
export type SignInState = { error: string | null; email: string };

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Sign-in failed:", error.code ?? error.message);
    if (error.code === "invalid_credentials") {
      return { error: "Wrong email or password.", email };
    }
    return { error: `Sign-in failed: ${error.message}`, email };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
