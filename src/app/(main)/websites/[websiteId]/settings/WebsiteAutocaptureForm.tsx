import { useState } from 'react';
import { MousePointerClick, Loader2 } from 'lucide-react';
import { useUpdateQuery, useWebsite } from '@/components/hooks';
import { Switch } from '@/components/ui/switch';

export function WebsiteAutocaptureForm({ websiteId }: { websiteId: string }) {
  const website = useWebsite();
  const { mutateAsync, isPending, touch } = useUpdateQuery(`/websites/${websiteId}`);
  const [enabled, setEnabled] = useState<boolean>(!!(website as any)?.autocaptureEnabled);

  const handleSwitch = async (checked: boolean) => {
    setEnabled(checked);
    await mutateAsync(
      { autocaptureEnabled: checked },
      {
        onSuccess: () => {
          touch(`website:${websiteId}`);
          touch('websites');
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5e5ba4]/15 text-indigo-300 ring-1 ring-inset ring-[#5e5ba4]/30">
          <MousePointerClick className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Autocapture events</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Automatically record clicks on buttons &amp; links, form submissions, and each
            visitor&apos;s scroll depth &amp; click count, no code needed. Events show up in your
            Goals &amp; Funnels picker. Only element labels are captured, never what visitors type.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          Enable autocapture
        </div>
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            id="autocapture"
            checked={enabled}
            onCheckedChange={handleSwitch}
            disabled={isPending}
            className="data-[state=checked]:bg-[#5e5ba4]"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70">
        Takes effect on each visitor&apos;s next page load. Turning it off stops new capture right
        away. Captured events count toward your usage like any other event.
      </p>
    </div>
  );
}
