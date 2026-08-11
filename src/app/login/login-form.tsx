"use client";

import { useActionState } from "react";

import { signInWithPassword, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInWithPassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
          placeholder="you@example.com"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
