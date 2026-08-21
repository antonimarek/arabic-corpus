type FormSubmitProps = {
  pending: boolean;
  label: string;
  pendingLabel?: string;
};

export function FormSubmit({
  pending,
  label,
  pendingLabel = "Saving…",
}: FormSubmitProps) {
  return (
    <>
      <div className="hidden sm:block">
        <button
          type="submit"
          disabled={pending}
          className="ui-btn-primary min-h-11"
        >
          {pending ? pendingLabel : label}
        </button>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_92%,white)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-soft)] sm:hidden">
        <button
          type="submit"
          disabled={pending}
          className="ui-btn-primary pointer-events-auto w-full py-3.5 text-[15px]"
        >
          {pending ? pendingLabel : label}
        </button>
      </div>
      <div className="h-20 sm:hidden" aria-hidden />
    </>
  );
}
