import { useMessages, useUpdateQuery } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';

export function TeamJoinForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const { formatMessage, labels, getErrorMessage } = useMessages();
  const { mutateAsync, error, touch, isPending } = useUpdateQuery('/teams/join');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    await mutateAsync(data, {
      onSuccess: async () => {
        touch('teams:members');
        onSave?.();
        onClose?.();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="text-sm text-red-500">
          {getErrorMessage(error)}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="accessCode" className="text-foreground">{formatMessage(labels.accessCode)}</Label>
        <Input
          id="accessCode"
          {...register('accessCode', { required: formatMessage(labels.required) })}
          autoComplete="off"
          className="dark:bg-[#18181b] dark:border-zinc-800"
        />
        {errors.accessCode && (
          <p className="text-sm text-red-500">{errors.accessCode.message as string}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
          className="dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
        >
          {formatMessage(labels.cancel)}
        </Button>
        <Button type="submit" disabled={isPending} className="bg-[#5e5ba4] hover:bg-[#5e5ba4]/90 text-white">
          {formatMessage(labels.join)}
        </Button>
      </div>
    </form>
  );
}
