'use client';

import { TeamsDataTable } from '@/app/(main)/teams/TeamsDataTable';
import { TeamsJoinButton } from '@/app/(main)/teams/TeamsJoinButton';
import { TeamsAddButton } from '@/app/(main)/teams/TeamsAddButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMessages, useLoginQuery } from '@/components/hooks';
import { ROLES } from '@/lib/constants';

export function TeamsSettings() {
    const { formatMessage, labels } = useMessages();
    const { user } = useLoginQuery();

    if (!user) return null;

    return (
        <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{formatMessage(labels.teams)}</CardTitle>
                <div className="flex items-center gap-2">
                    {user.role !== ROLES.viewOnly && <TeamsJoinButton />}
                    {user.role !== ROLES.viewOnly && <TeamsAddButton />}
                </div>
            </CardHeader>
            <CardContent>
                <TeamsDataTable />
            </CardContent>
        </Card>
    );
}
