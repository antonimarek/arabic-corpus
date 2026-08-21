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
          className="ui-input"
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
          className="ui-input"
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
        className="ui-btn-primary min-h-11"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
