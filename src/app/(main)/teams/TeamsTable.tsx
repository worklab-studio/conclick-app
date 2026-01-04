import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMessages } from '@/components/hooks';
import { ROLES } from '@/lib/constants';
import { ReactNode } from 'react';

export interface TeamsTableProps {
  data: any[];
  renderLink?: (row: any) => ReactNode;
}

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function TeamsTable({ data, renderLink }: TeamsTableProps) {
  const { formatMessage, labels } = useMessages();

  return (
    <div className="rounded-md border dark:border-zinc-800 overflow-hidden">
      <Table className="table-fixed">
        <TableHeader className="bg-zinc-900/50">
          <TableRow className="border-b border-zinc-800 hover:bg-transparent">
            <TableHead className="font-semibold text-zinc-400 pl-4 w-[20%]">{formatMessage(labels.name)}</TableHead>
            <TableHead className="font-semibold text-zinc-400 w-[20%]">{formatMessage(labels.owner)}</TableHead>
            <TableHead className="text-center font-semibold text-zinc-400 w-[20%]">{formatMessage(labels.members)}</TableHead>
            <TableHead className="text-center font-semibold text-zinc-400 w-[20%]">{formatMessage(labels.websites)}</TableHead>
            <TableHead className="w-[20%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((row) => {
            const owner = row?.members?.find(({ role }: any) => role === ROLES.teamOwner)?.user;
            const ownerName = owner?.username || 'Unknown';
            return (
              <TableRow key={row.id} className="border-b border-dashed border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <TableCell className="font-medium py-4 pl-4 truncate">
                  {renderLink ? renderLink(row) : row.name}
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={`https://avatar.vercel.sh/${ownerName}`} />
                      <AvatarFallback>{ownerName[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground truncate">{ownerName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center py-4">
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-normal bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                    {row?._count?.members || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-center py-4">
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-normal bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                    {row?._count?.websites || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-right py-4 pr-4">
                  <Button variant="ghost" size="sm" asChild className="hover:bg-zinc-800 text-muted-foreground hover:text-foreground">
                    <Link href={`/teams/${row.id}`} className="flex items-center gap-1">
                      View <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {!data?.length && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No teams found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
