import { TeamSettings } from './TeamSettings';
import { TeamProvider } from '../TeamProvider';

export default async function TeamPage({
    params,
}: {
    params: Promise<{ teamId: string }>;
}) {
    const { teamId } = await params;

    return (
        <TeamProvider teamId={teamId}>
            <TeamSettings teamId={teamId} />
        </TeamProvider>
    );
}
