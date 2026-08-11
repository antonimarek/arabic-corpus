"use server";

import { redirect } from "next/navigation";

import { isEmailAllowed } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { error: "Enter your email." };
  }

  if (!password) {
    return { error: "Enter your password." };
  }

  if (!isEmailAllowed(email)) {
    return { error: "This email is not allowed to access this app." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isEmailAllowed(user?.email)) {
    await supabase.auth.signOut();
    return { error: "This email is not allowed to access this app." };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
