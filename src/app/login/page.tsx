import { LoginForm } from "@/app/login/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage =
    params.error === "not_allowed"
      ? "This email is not allowed to access this app."
      : params.error === "auth"
        ? "Sign-in failed. Try again."
        : null;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="font-arabic text-2xl text-[var(--ink)]" lang="ar" dir="rtl">
          عربي
        </p>
        <h1 className="text-2xl font-medium tracking-tight text-[var(--ink)]">
          Levantine corpus
        </h1>
        <p className="text-[15px] text-[var(--ink-muted)]">
          Sign in with your allowlisted email and password.
        </p>
      </header>
      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="ui-panel p-5 sm:p-6">
        <LoginForm />
      </div>
    </main>
  );
}
