import { redirect } from 'next/navigation';

/**
 * The wizard now lives in a dialog on the websites page rather than on its own
 * route. This redirect keeps existing links working, including the marketing
 * site's ?site= handoff, by forwarding straight into the modal.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ site?: string | string[] }>;
}) {
  const { site } = await searchParams;
  const domain = Array.isArray(site) ? site[0] : site;
  const query = domain ? `&site=${encodeURIComponent(domain)}` : '';
  redirect(`/websites?setup=1${query}`);
}
