import { Check, X } from 'lucide-react';
import type { ComparisonData } from '@/content/schema';

function Cell({ v, accent }: { v: string | boolean; accent?: boolean }) {
  if (typeof v === 'boolean') {
    return v ? (
      <Check className={`mx-auto h-[18px] w-[18px] ${accent ? 'text-[#8b88cf]' : 'text-emerald-400/80'}`} />
    ) : (
      <X className="mx-auto h-[18px] w-[18px] text-zinc-600" />
    );
  }
  return <span className={accent ? 'font-medium text-white' : 'text-zinc-300'}>{v}</span>;
}

export function ComparisonTable({ data }: { data: ComparisonData }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02]">
            <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Feature</th>
            <th className="relative w-[26%] bg-[#6C63C9]/[0.12] px-4 py-4 text-center font-semibold text-white">
              <span className="absolute inset-x-0 top-0 h-0.5 bg-[#6C63C9]" />
              Conclick
            </th>
            <th className="w-[26%] px-4 py-4 text-center font-medium text-zinc-400">{data.competitor}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className="border-b border-white/[0.06] last:border-0">
              <td className="px-4 py-3.5 text-zinc-300">
                {r.feature}
                {r.note && <span className="mt-0.5 block text-xs text-zinc-500">{r.note}</span>}
              </td>
              <td className="bg-[#6C63C9]/[0.06] px-4 py-3.5 text-center align-middle">
                <Cell v={r.conclick} accent />
              </td>
              <td className="px-4 py-3.5 text-center align-middle">
                <Cell v={r.competitor} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
