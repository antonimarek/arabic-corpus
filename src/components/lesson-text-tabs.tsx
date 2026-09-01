"use client";

export type LessonTextTab = "study" | "dialogue";

type LessonTextTabsProps = {
  activeTab: LessonTextTab;
  onTabChange: (tab: LessonTextTab) => void;
};

const TABS: Array<{ id: LessonTextTab; label: string }> = [
  { id: "study", label: "Study" },
  { id: "dialogue", label: "Dialogue" },
];

export function LessonTextTabs({ activeTab, onTabChange }: LessonTextTabsProps) {
  return (
    <div
      className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1"
      role="tablist"
      aria-label="Lesson views"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`min-h-11 flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
