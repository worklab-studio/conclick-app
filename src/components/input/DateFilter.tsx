'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Check, ChevronDown } from 'lucide-react';
import { endOfYear, differenceInDays, isSameDay } from 'date-fns';
import { DatePickerForm } from '@/components/metrics/DatePickerForm';
import { useMessages, useMobile, useLocale } from '@/components/hooks';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { parseDateRange, formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

export interface DateFilterProps {
  value?: string;
  onChange?: (value: string) => void;
  showAllTime?: boolean;
  renderDate?: boolean;
  /** Call-site compatibility: 'bottom start' left-aligns the menu. */
  placement?: any;
  className?: string;
}

/**
 * The product's date range selector, shared by every website dashboard plus
 * links, pixels, cohorts, segments and retention.
 *
 * Built on our own dropdown rather than the upstream Umami select. That one
 * came from a different component library, so its radii, spacing and hover
 * states read as a foreign control sitting next to our buttons, and it stacked
 * twelve options into a single ~590px column, taller than the content it
 * filters. Two columns halve the height, and the resolved window is printed at
 * the top so "Last 24 hours" also says which hours those actually are.
 */
export function DateFilter({
  value,
  onChange,
  showAllTime,
  renderDate,
  placement,
  className,
}: DateFilterProps) {
  const { formatMessage, labels } = useMessages();
  const { locale } = useLocale();
  const { isMobile } = useMobile();
  const [showPicker, setShowPicker] = useState(false);

  // Mounted inside a FormField on the cohorts screen, which injects value and
  // onChange only after the first render, so neither can be assumed present.
  const safeValue = value || '24hour';
  const { startDate, endDate } = (parseDateRange(safeValue) || {}) as any;

  // A ':all' suffix is how an all-time selection carries its resolved bounds.
  const selected = safeValue.endsWith(':all') ? 'all' : safeValue;

  const recent = [
    { label: formatMessage(labels.today), value: '0day' },
    { label: formatMessage(labels.lastHours, { x: '24' }), value: '24hour' },
    { label: formatMessage(labels.thisWeek), value: '0week' },
    { label: formatMessage(labels.lastDays, { x: '7' }), value: '7day' },
    { label: formatMessage(labels.thisMonth), value: '0month' },
    { label: formatMessage(labels.lastDays, { x: '30' }), value: '30day' },
  ];

  const longer = [
    { label: formatMessage(labels.lastDays, { x: '90' }), value: '90day' },
    { label: formatMessage(labels.thisYear), value: '0year' },
    { label: formatMessage(labels.lastMonths, { x: '6' }), value: '6month' },
    { label: formatMessage(labels.lastMonths, { x: '12' }), value: '12month' },
    ...(showAllTime ? [{ label: formatMessage(labels.allTime), value: 'all' }] : []),
  ];

  const activeLabel =
    [...recent, ...longer].find(o => o.value === selected)?.label ||
    formatMessage(labels.customRange);

  const handleSelect = (next: string) => {
    if (next === 'custom') {
      setShowPicker(true);
      return;
    }
    onChange?.(next);
  };

  const handlePickerChange = (next: string) => {
    setShowPicker(false);
    onChange?.(next);
  };

  const rangeText = (from: Date, to: Date) =>
    isSameDay(from, to)
      ? formatDate(from, 'PP', locale)
      : `${formatDate(from, 'MMM d', locale)} to ${formatDate(to, 'PP', locale)}`;

  // A custom or offset range has no useful label, so the trigger shows dates.
  const showDatesInTrigger = safeValue.startsWith('range') || renderDate;
  const triggerText =
    showDatesInTrigger && startDate && endDate
      ? differenceInDays(endDate, startDate) === 0
        ? formatDate(startDate, 'PP', locale)
        : rangeText(startDate, endDate)
      : activeLabel;

  // The window the current selection resolves to, printed above the options.
  const resolved = startDate && endDate ? rangeText(startDate, endDate) : null;

  const renderOption = (opt: { label: string; value: string }) => (
    <DropdownMenuItem
      key={opt.value}
      onSelect={() => handleSelect(opt.value)}
      className={cn(
        'flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-300',
        'focus:bg-white/[0.06] focus:text-white data-[highlighted]:bg-white/[0.06]',
        selected === opt.value && 'bg-[#5e5ba4]/15 font-medium text-white',
      )}
    >
      <span className="truncate">{opt.label}</span>
      {selected === opt.value ? <Check className="h-3.5 w-3.5 shrink-0 text-[#b9b5f0]" /> : null}
    </DropdownMenuItem>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-10 w-full items-center justify-between gap-2 rounded-lg bg-[hsl(0,0%,8%)] px-3',
              'text-[13.5px] font-medium text-zinc-200 transition-colors',
              'hover:bg-[hsl(0,0%,11%)] data-[state=open]:bg-[hsl(0,0%,11%)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e5ba4]/50',
              className,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="truncate">{triggerText}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={placement === 'bottom start' ? 'start' : 'end'}
          sideOffset={6}
          className="w-[min(26rem,calc(100vw-2rem))] rounded-xl border-white/[0.08] bg-[hsl(0,0%,6.5%)] p-0 shadow-2xl"
        >
          {resolved ? (
            <div className="border-b border-white/[0.06] px-3.5 py-2.5">
              <div className="text-[10.5px] uppercase tracking-wide text-zinc-600">
                {formatMessage(labels.dateRange)}
              </div>
              <div className="mt-0.5 text-[12.5px] text-zinc-300">{resolved}</div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-x-2 p-2">
            <div>{recent.map(renderOption)}</div>
            <div>{longer.map(renderOption)}</div>
          </div>

          <div className="border-t border-white/[0.06] p-2">
            <DropdownMenuItem
              onSelect={() => handleSelect('custom')}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-400 focus:bg-white/[0.06] focus:text-white data-[highlighted]:bg-white/[0.06]"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {formatMessage(labels.customRange)}
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showPicker} onOpenChange={open => !open && setShowPicker(false)}>
        <DialogContent
          className={cn(
            'w-[calc(100vw-2rem)] border-white/[0.08] bg-[hsl(0,0%,6.5%)] focus:outline-none',
            isMobile ? 'max-w-none' : 'sm:w-auto sm:max-w-fit',
          )}
        >
          <DialogTitle className="text-base font-semibold text-white">
            {formatMessage(labels.customRange)}
          </DialogTitle>
          <DatePickerForm
            startDate={startDate}
            endDate={endDate}
            minDate={new Date(2000, 0, 1)}
            maxDate={endOfYear(new Date())}
            onChange={handlePickerChange}
            onClose={() => setShowPicker(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
