'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PagerProps {
  page: string | number;
  pageSize: string | number;
  count: string | number;
  onPageChange: (nextPage: number) => void;
  className?: string;
}

const BTN =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,9%)] px-3 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(0,0%,13%)] disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-muted-foreground/40 disabled:hover:bg-transparent';

export function Pager({ page, pageSize, count, onPageChange, className }: PagerProps) {
  const p = +page;
  const ps = +pageSize;
  const c = +count;
  const maxPage = ps && c ? Math.ceil(c / ps) : 0;

  if (!c || !maxPage || maxPage === 1) {
    return null;
  }

  const firstPage = p <= 1;
  const lastPage = p >= maxPage;
  const start = (p - 1) * ps + 1;
  const end = Math.min(p * ps, c);

  const go = (next: number) => {
    if (next > 0 && next <= maxPage) onPageChange(next);
  };

  return (
    <div
      className={`mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-3 px-7 ${className || ''}`}
    >
      <div className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-semibold text-foreground">
          {start.toLocaleString()}–{end.toLocaleString()}
        </span>{' '}
        of <span className="font-semibold text-foreground">{c.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={() => go(p - 1)} disabled={firstPage} className={BTN}>
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <span className="text-sm tabular-nums text-muted-foreground">
          Page <span className="font-semibold text-foreground">{p.toLocaleString()}</span> of{' '}
          <span className="font-semibold text-foreground">{maxPage.toLocaleString()}</span>
        </span>
        <button type="button" onClick={() => go(p + 1)} disabled={lastPage} className={BTN}>
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
