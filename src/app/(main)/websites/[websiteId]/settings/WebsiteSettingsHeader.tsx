import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useMessages, useNavigation, useWebsite } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import { SiteIcon } from '@/app/(main)/websites/SiteIcon';

export function WebsiteSettingsHeader() {
  const website = useWebsite();
  const { formatMessage, labels } = useMessages();
  const { renderUrl } = useNavigation();

  return (
    <>
      <Link href={renderUrl(`/websites/${website.id}`)}>
        <Button variant="ghost" className="gap-2 -ml-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          {formatMessage(labels.website)}
        </Button>
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <SiteIcon domain={website?.domain} name={website?.name} size={36} className="rounded-lg" />
        <div>
          <h1 className="text-xl font-semibold">{website?.name}</h1>
          <p className="text-sm text-muted-foreground">{website?.domain}</p>
        </div>
      </div>
    </>
  );
}
