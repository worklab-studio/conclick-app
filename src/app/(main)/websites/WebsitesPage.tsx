'use client';
import { Suspense } from 'react';
import { WebsitesDataTable } from './WebsitesDataTable';
import { WebsiteAddButton } from './WebsiteAddButton';
import { OnboardingModal } from './OnboardingModal';
import { useMessages, useNavigation } from '@/components/hooks';

export function WebsitesPage() {
  const { teamId } = useNavigation();
  const { formatMessage, labels } = useMessages();

  return (
    <div className="mx-auto w-full px-3 md:px-6 py-8" style={{ maxWidth: '1320px' }}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {formatMessage(labels.websites)}
          </h1>
          <WebsiteAddButton teamId={teamId} />
        </div>
        <WebsitesDataTable teamId={teamId} />
      </div>

      {/* One wizard for the whole page, opened by the ?setup= param from the
          empty state, the header button, or an unfinished site's card. */}
      {!teamId ? (
        <Suspense>
          <OnboardingModal />
        </Suspense>
      ) : null}
    </div>
  );
}
