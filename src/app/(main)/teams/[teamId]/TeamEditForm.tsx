'use client';

import { getRandomChars } from '@/lib/generate';
import { useMessages, useTeam, useUpdateQuery } from '@/components/hooks';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

const generateId = () => `team_${getRandomChars(16)}`;

export function TeamEditForm({
  teamId,
  allowEdit,
  showAccessCode,
  onSave,
}: {
  teamId: string;
  allowEdit?: boolean;
  showAccessCode?: boolean;
  onSave?: () => void;
}) {
  const team = useTeam();
  const { formatMessage, labels, messages, getErrorMessage } = useMessages();

  const { mutateAsync, error, isPending, touch, toast } = useUpdateQuery(`/teams/${teamId}`);

  const { register, handleSubmit, setValue, watch, formState } = useForm({
    defaultValues: {
      id: team?.id || '',
      name: team?.name || '',
      accessCode: team?.accessCode || '',
    },
  });

  useEffect(() => {
    if (team) {
      setValue('id', team.id);
      setValue('name', team.name);
      setValue('accessCode', team.accessCode);
    }
  }, [team, setValue]);

  const onSubmit = async (data: any) => {
    await mutateAsync(data, {
      onSuccess: async () => {
        toast(formatMessage(messages.saved));
        touch('teams');
        touch(`teams:${teamId}`);
        onSave?.();
      },
    });
  };

  const handleRegenerate = () => {
    setValue('accessCode', generateId(), { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="text-sm text-red-500">
          {getErrorMessage(error)}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="id">{formatMessage(labels.teamId)}</Label>
        <div className="flex gap-2">
          <Input
            id="id"
            {...register('id')}
            readOnly
            className="bg-zinc-50 dark:bg-zinc-900/50 dark:border-zinc-800"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(watch('id'))}
          >
            Copy
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="name">{formatMessage(labels.name)}</Label>
        <Input
          id="name"
          {...register('name', { required: formatMessage(labels.required) })}
          readOnly={!allowEdit}
          className={!allowEdit ? 'bg-zinc-50 dark:bg-zinc-900/50 dark:border-zinc-800' : 'dark:bg-[#18181b] dark:border-zinc-800'}
        />
        {formState.errors.name && (
          <p className="text-sm text-red-500">{formState.errors.name.message as string}</p>
        )}
      </div>

      {showAccessCode && (
        <div className="grid gap-2">
          <Label htmlFor="accessCode">{formatMessage(labels.accessCode)}</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                id="accessCode"
                {...register('accessCode')}
                readOnly
                className="bg-zinc-50 dark:bg-zinc-900/50 dark:border-zinc-800"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(watch('accessCode'))}
              >
                Copy
              </Button>
            </div>
            {allowEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRegenerate}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {formatMessage(labels.regenerate)}
              </Button>
            )}
          </div>
        </div>
      )}

      {allowEdit && (
        <div className="flex justify-start pt-4">
          <Button type="submit" disabled={isPending || !formState.isDirty} className="bg-[#5e5ba4] hover:bg-[#5e5ba4]/90 text-white">
            {isPending ? 'Saving...' : formatMessage(labels.save)}
          </Button>
        </div>
      )}
    </form>
  );
}
