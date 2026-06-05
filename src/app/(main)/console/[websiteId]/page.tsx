import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TestConsolePage } from './TestConsolePage';

// Strict equality with 'true'. Previously `!!process.env.ENABLE_TEST_CONSOLE`
// was truthy for ANY non-empty string — including the literal 'false', '0',
// 'no' — so an operator trying to disable the synthetic event-injection UI
// would actually have it on.
function isEnabled() {
  return process.env.ENABLE_TEST_CONSOLE === 'true';
}

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  if (!isEnabled()) {
    // notFound() instead of `return null` so the route returns a real 404,
    // hiding the existence of the internal debug feature.
    notFound();
  }

  const { websiteId } = await params;

  return <TestConsolePage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Test Console',
};
