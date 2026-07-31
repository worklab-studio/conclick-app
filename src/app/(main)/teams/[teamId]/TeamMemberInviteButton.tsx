'use client';

import { useState } from 'react';
import { useApi } from '@/components/hooks';
import { useToast } from '@umami/react-zen';
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
import { Mail } from 'lucide-react';
import { ROLES } from '@/lib/constants';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function TeamMemberInviteButton({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const { post } = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, formState, reset } = useForm({
    defaultValues: { email: '', role: ROLES.teamMember },
  });

  const { mutateAsync, error, isPending } = useMutation({
    mutationFn: (data: any) => post(`/teams/${teamId}/invites`, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['teams:invites', teamId] });
      toast(
        res?.emailSent === false
          ? 'Invite created, but the email could not be sent, check the Resend domain.'
          : 'Invitation sent.',
      );
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
        <Button className="gap-2 bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90">
          <Mail className="h-4 w-4" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Invite a member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500">
              {(error as any)?.message || 'Could not send the invite.'}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="email" className="text-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email', { required: 'Email is required' })}
              placeholder="teammate@company.com"
              className="dark:border-zinc-800 dark:bg-[#18181b]"
            />
            {formState.errors.email && (
              <p className="text-sm text-red-500">{formState.errors.email.message as string}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role" className="text-foreground">
              Role
            </Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="dark:border-zinc-800 dark:bg-[#18181b]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:border-zinc-800 dark:bg-[#18181b]">
                    <SelectItem value={ROLES.teamManager}>Manager</SelectItem>
                    <SelectItem value={ROLES.teamMember}>Member</SelectItem>
                    <SelectItem value={ROLES.teamViewOnly}>View only</SelectItem>
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
              className="dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90"
            >
              {isPending ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
