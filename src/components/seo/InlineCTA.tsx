import { ArrowRight } from 'lucide-react';

const APP = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';

// A slim inline conversion band dropped between sections (lighter than the
// full lead-magnet card / footer band).
export function InlineCTA({ label = 'See this on your own site' }: { label?: string }) {
  return (
    <div className="my-10 flex flex-col items-center justify-between gap-4 rounded-xl border border-[#6C63C9]/30 bg-[#6C63C9]/[0.08] px-6 py-5 sm:flex-row">
      <div className="text-sm text-zinc-200">
        <span className="font-semibold text-white">{label}</span>, free for 14 days, no card.
      </div>
      <a
        href={`${APP}/register`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#6C63C9] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7b73d6]"
      >
        Add My Website <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
