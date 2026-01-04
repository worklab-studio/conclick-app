'use client';

import { Button } from '@/components/ui/button';
import { Share, Settings } from 'lucide-react';
import { useNavigation, useWebsiteQuery } from '@/components/hooks';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { WebsiteShareForm } from '@/app/(main)/websites/[websiteId]/settings/WebsiteShareForm';
import { WebsiteSelect } from '@/components/input/WebsiteSelect';
import { DateRangePicker } from '@/components/input/DateRangePicker';

export function WebsiteHeader({ websiteId }: { websiteId: string }) {
  const { data: website } = useWebsiteQuery(websiteId);
  const { renderUrl, router } = useNavigation();

  if (!website) return null;

  const handleWebsiteChange = (id: string) => {
    router.push(renderUrl(`/websites/${id}`));
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <WebsiteSelect websiteId={websiteId} onChange={handleWebsiteChange} />
        <DateRangePicker websiteId={websiteId} />
      </div>

      <div className="flex items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] !bg-zinc-950 !border-zinc-800 text-zinc-200">
            <DialogHeader>
              <DialogTitle>Share Website</DialogTitle>
            </DialogHeader>
            <WebsiteShareForm websiteId={website.id} shareId={website.shareId} />
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link href={renderUrl(`/websites/${website.id}/settings`)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  );
}
