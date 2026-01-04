import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateQuery, useMessages } from '@/components/hooks';
import { DOMAIN_REGEX } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().min(1, 'Domain is required').regex(DOMAIN_REGEX, 'Invalid domain'),
});

type FormValues = z.infer<typeof schema>;

export function WebsiteAddForm({
  teamId,
  onSave,
  onClose,
}: {
  teamId?: string;
  onSave?: () => void;
  onClose?: () => void;
}) {
  const { formatMessage, labels, messages } = useMessages();
  const { mutateAsync, isPending } = useUpdateQuery('/websites', { teamId });
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    try {
      await mutateAsync(data);
      onSave?.();
      onClose?.();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="name" className="text-foreground">{formatMessage(labels.name)}</Label>
        <Input
          id="name"
          {...register('name')}
          autoComplete="off"
          className="dark:bg-[#18181b] dark:border-zinc-800"
          placeholder="My Website"
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="domain" className="text-foreground">{formatMessage(labels.domain)}</Label>
        <Input
          id="domain"
          {...register('domain')}
          autoComplete="off"
          className="dark:bg-[#18181b] dark:border-zinc-800"
          placeholder="example.com"
        />
        {errors.domain && <p className="text-sm text-red-500">{errors.domain.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onClose && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onClose}
            className="dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            {formatMessage(labels.cancel)}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="bg-[#5e5ba4] hover:bg-[#4e4b95] text-white !bg-[#5e5ba4] !text-white border-0"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {formatMessage(labels.save)}
        </Button>
      </div>
    </form>
  );
}
