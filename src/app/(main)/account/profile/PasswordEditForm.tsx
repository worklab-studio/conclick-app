import { useMessages, useUpdateQuery } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';

export function PasswordEditForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const { formatMessage, labels, messages, getErrorMessage } = useMessages();
  const { mutateAsync, error, isPending } = useUpdateQuery('/me/password');

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const newPassword = watch('newPassword');

  const handleSubmitForm = async (data: any) => {
    await mutateAsync(data, {
      onSuccess: async () => {
        onSave();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
      {error && (
        <div className="text-sm text-red-500">
          {getErrorMessage(error)}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="currentPassword" className="text-foreground">{formatMessage(labels.currentPassword)}</Label>
        <Input
          id="currentPassword"
          type="password"
          {...register('currentPassword', { required: formatMessage(labels.required) })}
          autoComplete="current-password"
          className="dark:bg-[#18181b] dark:border-zinc-800"
        />
        {errors.currentPassword && (
          <p className="text-sm text-red-500">{errors.currentPassword.message as string}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="newPassword" className="text-foreground">{formatMessage(labels.newPassword)}</Label>
        <Input
          id="newPassword"
          type="password"
          {...register('newPassword', {
            required: formatMessage(labels.required),
            minLength: { value: 8, message: formatMessage(messages.minPasswordLength, { n: 8 }) }
          })}
          autoComplete="new-password"
          className="dark:bg-[#18181b] dark:border-zinc-800"
        />
        {errors.newPassword && (
          <p className="text-sm text-red-500">{errors.newPassword.message as string}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword" className="text-foreground">{formatMessage(labels.confirmPassword)}</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword', {
            required: formatMessage(labels.required),
            validate: (value) => value === newPassword || formatMessage(messages.noMatchPassword)
          })}
          autoComplete="new-password"
          className="dark:bg-[#18181b] dark:border-zinc-800"
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword.message as string}</p>
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
          {formatMessage(labels.save)}
        </Button>
      </div>
    </form>
  );
}
