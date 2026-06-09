import type { LucideIcon } from 'lucide-react';

/**
 * Intentional empty state for a dashboard tab — a centered violet icon badge,
 * title, and muted description (matches the StripeConnectPlaceholder look).
 * Read-only (no actions), so it's safe to render on the public share too.
 */
export function TabEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex w-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#5e5ba4]/15 text-indigo-300 ring-1 ring-inset ring-[#5e5ba4]/25">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
