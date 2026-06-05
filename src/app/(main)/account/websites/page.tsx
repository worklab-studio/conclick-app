import { Metadata } from 'next';
import { WebsitesSettingsPage } from './WebsitesSettingsPage';

// This route has no [teamId] dynamic segment, so the previous destructure
// always produced undefined and the type annotation lied. Render the page
// without a teamId so it falls through to listing the caller's personal
// websites — the original (likely intended) behavior.
export default async function () {
  return <WebsitesSettingsPage />;
}

export const metadata: Metadata = {
  title: 'Websites',
};
