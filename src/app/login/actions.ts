"use server";

import { redirect } from "next/navigation";

import { getSiteUrl, isEmailAllowed } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
  sent?: boolean;
};

export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Enter your email." };
  }

  if (!isEmailAllowed(email)) {
    return { error: "This email is not allowed to access this app." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { sent: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
