'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useUserWebsitesQuery,
  useMessages,
  useLoginQuery,
  useWebsiteQuery,
} from '@/components/hooks';

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
  const { formatMessage, messages } = useMessages();
  const { data: website } = useWebsiteQuery(websiteId);
  const { user } = useLoginQuery();
  const { data, isLoading } = useUserWebsitesQuery(
    { userId: user?.id, teamId },
    { pageSize: 100, includeTeams } // Increased page size to avoid pagination complexity for now
  );

  const listItems: { id: string; name: string }[] = data?.['data'] || [];

  // If current website is not in the list (e.g. pagination), add it temporarily to show correct label
  const currentItem = listItems.find(item => item.id === websiteId);
  const displayItems = !currentItem && website ? [...listItems, website] : listItems;

  return (
    <Select value={websiteId} onValueChange={onChange}>
      <SelectTrigger className="w-[200px] border dark:border-[hsl(0,0%,12%)] bg-background dark:bg-[hsl(0,0%,9%)] hover:bg-accent/50 transition-colors text-foreground">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={website?.name || "Select website"} />
        </div>
      </SelectTrigger>
      <SelectContent className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        {displayItems.map((item) => (
          <SelectItem key={item.id} value={item.id} className="cursor-pointer focus:bg-[hsl(0,0%,12%)] text-foreground">
            {item.name}
          </SelectItem>
        ))}
        {displayItems.length === 0 && !isLoading && (
          <div className="p-2 text-sm text-muted-foreground text-center">No websites found</div>
        )}
      </SelectContent>
    </Select>
  );
}
