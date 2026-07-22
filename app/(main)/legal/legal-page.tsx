import type { ReactNode } from "react";

/**
 * Shared shell for the legal pages: consistent typographic rhythm without
 * pulling in a typography plugin, and a semantic heading hierarchy
 * (h1 → h2 sections).
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl pb-16">
      <header className="mb-8 border-b border-border/60 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        <p className="mt-4 text-muted-foreground">{intro}</p>
      </header>
      <div
        className="space-y-8 text-[0.95rem] leading-relaxed
          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight
          [&_h3]:text-base [&_h3]:font-semibold
          [&_p]:mt-3 [&_p]:text-muted-foreground
          [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ul]:text-muted-foreground
          [&_strong]:font-semibold [&_strong]:text-foreground
          [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline"
      >
        {children}
      </div>
    </article>
  );
}
