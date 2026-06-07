'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserWebsitesQuery, useLoginQuery, useWebsiteQuery } from '@/components/hooks';
import { SiteIcon } from '@/app/(main)/websites/SiteIcon';
import { Globe } from 'lucide-react';

export function WebsiteSelect({
  websiteId,
  teamId,
  onChange,
  includeTeams,
}: {
  websiteId?: string;
  teamId?: string;
  onChange: (value: string) => void;
  includeTeams?: boolean;
}) {
  const { data: website } = useWebsiteQuery(websiteId);
  const { user } = useLoginQuery();
  const { data, isLoading } = useUserWebsitesQuery(
    { userId: user?.id, teamId },
    { pageSize: 100, includeTeams },
  );

  const listItems: { id: string; name: string; domain?: string }[] = data?.['data'] || [];

  // If the current website isn't in the (paged) list, append it so the label is correct.
  const currentItem = listItems.find(item => item.id === websiteId);
  const displayItems = !currentItem && website ? [...listItems, website] : listItems;

  return (
    <Select value={websiteId} onValueChange={onChange}>
      <SelectTrigger className="w-[220px] border bg-background text-foreground transition-colors hover:bg-accent/50 dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,9%)]">
        {/* Custom trigger content (not SelectValue) so the icon + name stay tidy. */}
        <div className="flex min-w-0 items-center gap-2">
          {website ? (
            <SiteIcon domain={website.domain} name={website.name} size={18} />
          ) : (
            <Globe className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="truncate text-sm">{website?.name || 'Select website'}</span>
        </div>
        {/* Hidden SelectValue keeps Radix's selected-value semantics intact. */}
        <span className="sr-only">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="min-w-[240px] dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]">
        {displayItems.map(item => (
          <SelectItem
            key={item.id}
            value={item.id}
            className="cursor-pointer py-2 text-foreground focus:bg-[hsl(0,0%,12%)]"
          >
            <div className="flex items-center gap-2.5">
              <SiteIcon domain={item.domain} name={item.name} size={20} />
              <div className="flex flex-col">
                <span className="text-sm leading-tight text-foreground">{item.name}</span>
                {item.domain && (
                  <span className="text-xs leading-tight text-muted-foreground">{item.domain}</span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
        {displayItems.length === 0 && !isLoading && (
          <div className="p-2 text-center text-sm text-muted-foreground">No websites found</div>
        )}
      </SelectContent>
    </Select>
  );
}
