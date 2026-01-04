import { TeamMembersTable } from './TeamMembersTable';
import { useTeamMembersQuery } from '@/components/hooks';
import { TeamMemberAddButton } from './TeamMemberAddButton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigation } from '@/components/hooks';

export function TeamMembersDataTable({
  teamId,
  allowEdit = false,
}: {
  teamId: string;
  allowEdit?: boolean;
}) {
  const { query: queryParams, updateParams } = useNavigation();
  const [search, setSearch] = useState(queryParams?.search || '');
  const queryResult = useTeamMembersQuery(teamId);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== queryParams?.search) {
        updateParams({ search: search || undefined });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, queryParams?.search, updateParams]);

  const { data, isLoading } = queryResult;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 dark:bg-[#18181b] dark:border-zinc-800"
          />
        </div>
        {allowEdit && <TeamMemberAddButton teamId={teamId} />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8 text-zinc-500">
          Loading...
        </div>
      ) : (
        <TeamMembersTable data={data?.data || []} teamId={teamId} allowEdit={allowEdit} />
      )}
    </div>
  );
}
