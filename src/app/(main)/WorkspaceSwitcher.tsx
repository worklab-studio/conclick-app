'use client';

import { ChevronsUpDown, Check, Building2, User } from 'lucide-react';
import { useLoginQuery, useNavigation, useUserTeamsQuery } from '@/components/hooks';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

// Personal / team workspace switcher. Selecting a team navigates to its
// websites; useNavigation derives the active team from the URL.
export function WorkspaceSwitcher() {
  const { router, teamId } = useNavigation();
  const { user } = useLoginQuery();
  const { data } = useUserTeamsQuery(user?.id);
  const teams: any[] = Array.isArray(data) ? data : ((data as any)?.data ?? []);

  if (!teams.length) {
    return null;
  }

  const active = teams.find(t => t.id === teamId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,9%)] px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(0,0%,12%)]"
        >
          {active ? (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="max-w-[140px] truncate">{active ? active.name : 'Personal'}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]"
      >
        <DropdownMenuItem
          onClick={() => router.push('/websites')}
          className="cursor-pointer focus:bg-[hsl(0,0%,12%)]"
        >
          <User className="mr-2 h-4 w-4" /> Personal
          {!teamId ? <Check className="ml-auto h-4 w-4 text-[#8b88cf]" /> : null}
        </DropdownMenuItem>
        {teams.map(t => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => router.push(`/teams/${t.id}/websites`)}
            className="cursor-pointer focus:bg-[hsl(0,0%,12%)]"
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">{t.name}</span>
            {teamId === t.id ? <Check className="ml-auto h-4 w-4 text-[#8b88cf]" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
