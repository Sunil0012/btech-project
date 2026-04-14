import type { ReactNode } from "react";

interface TeacherWorkspaceHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  chips?: string[];
  actions?: ReactNode;
  aside?: ReactNode;
}

export function TeacherWorkspaceHeader({
  eyebrow,
  title,
  description,
  chips = [],
  actions,
  aside,
}: TeacherWorkspaceHeaderProps) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-border bg-card/95 shadow-sm">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),transparent_62%),radial-gradient(circle_at_top_right,hsl(var(--accent)/0.14),transparent_32%)]" />
        <div className="absolute left-8 top-8 h-20 w-20 rounded-full border border-primary/10 bg-primary/5" />
        <div className="absolute right-20 top-6 h-12 w-12 rotate-12 rounded-[1rem] border border-primary/10 bg-primary/10" />

        <div className="relative grid gap-4 p-5 pt-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
          <div className="rounded-[1.25rem] border border-border bg-card/90 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">{eyebrow}</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>

            {(chips.length > 0 || actions) && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-xs font-medium text-primary"
                  >
                    {chip}
                  </span>
                ))}
                {actions}
              </div>
            )}
          </div>

          {aside ? (
            <div className="rounded-[1.25rem] border border-border bg-muted/35 p-5 shadow-sm backdrop-blur">
              {aside}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
