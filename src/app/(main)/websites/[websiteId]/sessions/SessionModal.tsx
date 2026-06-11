'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SessionProfile } from '@/app/(main)/websites/[websiteId]/sessions/SessionProfile';
import { useNavigation } from '@/components/hooks';

// Visitor session detail as a centered modal overlay. Radix locks the page
// behind it (no background scroll), and the open/close navigation uses
// scroll:false so the underlying list never jumps to the top.
export function SessionModal({ websiteId }: { websiteId: string }) {
  const {
    router,
    query: { session },
    updateParams,
  } = useNavigation();

  const close = () => router.push(updateParams({ session: undefined }), { scroll: false });

  return (
    <Dialog open={!!session} onOpenChange={open => !open && close()}>
      <DialogContent className="max-h-[88vh] w-[min(96vw,56rem)] max-w-4xl overflow-y-auto border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] p-6">
        <DialogTitle className="sr-only">Visitor session</DialogTitle>
        {session ? (
          <SessionProfile websiteId={websiteId} sessionId={session} onClose={close} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
