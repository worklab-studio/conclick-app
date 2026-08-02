'use client';
import { Suspense } from 'react';
import { WebsitesDataTable } from './WebsitesDataTable';
import { WebsiteAddButton } from './WebsiteAddButton';
import { OnboardingModal } from './OnboardingModal';
import {
  useLoginQuery,
  useMessages,
  useNavigation,
  useUserWebsitesQuery,
} from '@/components/hooks';

export function WebsitesPage() {
  const { teamId } = useNavigation();
  const { formatMessage, labels } = useMessages();
  const { user } = useLoginQuery();

  // Same query key the grid uses, so this is a cache read rather than a second
  // request. It exists only to answer "is this a first run".
  const { data, isLoading } = useUserWebsitesQuery({ userId: user?.id, teamId });
  const count = Array.isArray(data) ? data.length : ((data as any)?.count ?? 0);

  // On a first run the empty state already owns a large primary call to action,
  // so a second identically styled button pointing at the same wizard just
  // splits attention. It comes back as soon as there is a list to add to.
  const showAddButton = !!teamId || isLoading || count > 0;

  return (
    <div className="mx-auto w-full px-3 md:px-6 py-8" style={{ maxWidth: '1320px' }}>
      <div className="space-y-6">
        <div className="flex min-h-[40px] items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {formatMessage(labels.websites)}
          </h1>
          {showAddButton ? <WebsiteAddButton teamId={teamId} /> : null}
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
