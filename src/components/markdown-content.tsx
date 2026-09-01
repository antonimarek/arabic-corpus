"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type ReactNode, isValidElement } from "react";

import { blockDirection, isMostlyArabic } from "@/lib/markdown-direction";
import { hasArabicScript } from "@/lib/mixed-script";

function nodeText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (isValidElement(children)) {
    const props = children.props as { children?: ReactNode };
    return nodeText(props.children);
  }
  return "";
}

function arabicClass(children: ReactNode): string {
  return hasArabicScript(nodeText(children)) ? "font-arabic" : "";
}

function cellAlignClass(direction: ReturnType<typeof blockDirection>): string {
  if (direction === "rtl") return "text-end";
  return "text-start";
}

const listItemClass =
  "[&>p]:mb-1 [&>p:last-child]:mb-0 [&>ul]:mt-2 [&>ol]:mt-2";

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 text-base font-medium text-[var(--ink)] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 text-sm font-medium text-[var(--ink)]">{children}</h3>
  ),
  p: ({ children }) => {
    const text = nodeText(children);
    const direction = blockDirection(text);
    return (
      <p
        dir={direction}
        className={`mb-3 text-sm leading-relaxed text-[var(--ink)] last:mb-0 ${arabicClass(children)} ${direction === "rtl" ? "text-end" : ""}`.trim()}
      >
        {children}
      </p>
    );
  },
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-2 ps-5 text-sm leading-relaxed text-[var(--ink)] marker:text-[var(--ink-muted)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-2 ps-5 text-sm leading-relaxed text-[var(--ink)] marker:text-[var(--ink-muted)]">
      {children}
    </ol>
  ),
  li: ({ children }) => {
    const text = nodeText(children);
    const mostlyArabic = isMostlyArabic(text);
    return (
      <li
        dir={mostlyArabic ? "rtl" : undefined}
        className={`${listItemClass} ${mostlyArabic ? "font-arabic text-end" : ""}`.trim()}
      >
        {children}
      </li>
    );
  },
  strong: ({ children }) => (
    <strong className="font-medium text-[var(--ink)]">{children}</strong>
  ),
  em: ({ children }) => <em className="text-[var(--ink-muted)]">{children}</em>,
  blockquote: ({ children }) => {
    const text = nodeText(children);
    const direction = blockDirection(text);
    return (
      <blockquote
        dir={direction}
        className={`my-3 border-s-2 border-[var(--line)] ps-3 text-sm leading-relaxed text-[var(--ink-muted)] ${arabicClass(children)} ${direction === "rtl" ? "text-end" : ""}`.trim()}
      >
        {children}
      </blockquote>
    );
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full max-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-[var(--line)] bg-[var(--surface)]">
      {children}
    </thead>
  ),
  th: ({ children }) => {
    const text = nodeText(children);
    const direction = blockDirection(text);
    return (
      <th
        dir={direction}
        className={`px-3 py-2 font-medium text-[var(--ink)] ${cellAlignClass(direction)} ${arabicClass(children)}`}
      >
        {children}
      </th>
    );
  },
  td: ({ children }) => {
    const text = nodeText(children);
    const direction = blockDirection(text);
    return (
      <td
        dir={direction}
        className={`border-t border-[var(--line)] px-3 py-2 align-top text-[var(--ink)] ${cellAlignClass(direction)} ${arabicClass(children)}`}
      >
        {children}
      </td>
    );
  },
  hr: () => <hr className="my-6 border-[var(--line)]" />,
  code: ({ children }) => (
    <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--ink)]">
      {children}
    </code>
  ),
};

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div
      dir="ltr"
      className={`markdown-content text-start ${className}`.trim()}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
