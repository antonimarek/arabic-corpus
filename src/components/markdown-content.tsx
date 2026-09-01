"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type ReactNode, isValidElement } from "react";

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

function textClasses(children: ReactNode): string {
  const text = nodeText(children);
  return hasArabicScript(text) ? "font-arabic" : "";
}

function blockProps(children: ReactNode) {
  const text = nodeText(children);
  return {
    dir: "auto" as const,
    className: textClasses(children),
    lang: hasArabicScript(text) ? "ar" : undefined,
  };
}

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 text-base font-medium text-[var(--ink)] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 text-sm font-medium text-[var(--ink)]">{children}</h3>
  ),
  p: ({ children }) => (
    <p
      {...blockProps(children)}
      className={`mb-3 text-sm leading-relaxed text-[var(--ink)] last:mb-0 ${textClasses(children)}`}
    />
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-2 ps-5 text-sm leading-relaxed text-[var(--ink)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-2 ps-5 text-sm leading-relaxed text-[var(--ink)]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li {...blockProps(children)} className={textClasses(children)}>
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-[var(--ink)]">{children}</strong>
  ),
  em: ({ children }) => <em className="text-[var(--ink-muted)]">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote
      {...blockProps(children)}
      className={`my-3 border-s-2 border-[var(--line)] ps-3 text-sm leading-relaxed text-[var(--ink-muted)] ${textClasses(children)}`}
    >
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-[var(--line)] bg-[var(--surface)]">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th
      {...blockProps(children)}
      className={`px-3 py-2 text-start font-medium text-[var(--ink)] ${textClasses(children)}`}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      {...blockProps(children)}
      className={`border-t border-[var(--line)] px-3 py-2 align-top text-[var(--ink)] ${textClasses(children)}`}
    >
      {children}
    </td>
  ),
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
    <div className={`markdown-content ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
