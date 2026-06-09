import { getWebsite } from '@/queries/prisma';
import { getTeamOwner } from '@/queries/prisma/teamUser';
import { getUser } from '@/queries/prisma/user';
import { isPaidOrTrialUser } from '@/lib/billing';

// Analytics access is gated by the website's EFFECTIVE OWNER's plan: a team-owned
// site inherits the TEAM OWNER's subscription; a personal site uses its owner's.
// This lets a free team member view a paid team's analytics with no paywall,
// while their own personal sites stay gated by their own plan.
export async function websiteHasPaidOwner(websiteId: string): Promise<boolean> {
  const website = await getWebsite(websiteId);
  if (!website) {
    return false;
  }
  if (website.teamId) {
    const owner = await getTeamOwner(website.teamId);
    return owner?.user ? isPaidOrTrialUser(owner.user as any) : false;
  }
  if (website.userId) {
    const owner = await getUser(website.userId);
    return owner ? isPaidOrTrialUser(owner as any) : false;
  }
  return false;
}
