'use client';

import { useState } from 'react';
import { useMessages, useModified, useApi } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { ROLES } from '@/lib/constants';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function TeamMemberAddButton({ teamId }: { teamId: string }) {
    const { formatMessage, labels, getErrorMessage } = useMessages();
    const { touch } = useModified();
    const [open, setOpen] = useState(false);
    const { post } = useApi();
    const queryClient = useQueryClient();

    const { register, handleSubmit, control, formState, reset } = useForm({
        defaultValues: {
            userId: '',
            role: ROLES.teamMember,
        },
    });

    const { mutateAsync, error, isPending } = useMutation({
        mutationFn: (data: any) => post(`/teams/${teamId}/users`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams:members'] });
            queryClient.invalidateQueries({ queryKey: [`teams:${teamId}`] });
            touch('teams:members');
            touch(`teams:${teamId}`);
            setOpen(false);
            reset();
        },
    });

    const onSubmit = async (data: any) => {
        await mutateAsync(data);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-[#5e5ba4] hover:bg-[#5e5ba4]/90 text-white">
                    <UserPlus className="h-4 w-4" />
                    Add Member
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Add Member</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {error && (
                        <div className="text-sm text-red-500">
                            {getErrorMessage(error)}
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="userId" className="text-foreground">
                            Username / User ID
                        </Label>
                        <Input
                            id="userId"
                            {...register('userId', { required: formatMessage(labels.required) })}
                            placeholder="Enter username or user ID"
                            className="dark:bg-[#18181b] dark:border-zinc-800"
                        />
                        {formState.errors.userId && (
                            <p className="text-sm text-red-500">
                                {formState.errors.userId.message as string}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="role" className="text-foreground">{formatMessage(labels.role)}</Label>
                        <Controller
                            name="role"
                            control={control}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="dark:bg-[#18181b] dark:border-zinc-800">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-[#18181b] dark:border-zinc-800">
                                        <SelectItem value={ROLES.teamManager}>
                                            {formatMessage(labels.manager)}
                                        </SelectItem>
                                        <SelectItem value={ROLES.teamMember}>
                                            {formatMessage(labels.member)}
                                        </SelectItem>
                                        <SelectItem value={ROLES.teamViewOnly}>
                                            {formatMessage(labels.viewOnly)}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isPending}
                            className="dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
                        >
                            {formatMessage(labels.cancel)}
                        </Button>
                        <Button type="submit" disabled={isPending} className="bg-[#5e5ba4] hover:bg-[#5e5ba4]/90 text-white">
                            {isPending ? 'Adding...' : formatMessage(labels.add)}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
