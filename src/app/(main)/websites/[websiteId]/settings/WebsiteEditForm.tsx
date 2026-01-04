import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMessages, useUpdateQuery, useWebsite } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DOMAIN_REGEX } from '@/lib/constants';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string()
    .min(1, 'Domain is required')
    .regex(DOMAIN_REGEX, 'Invalid domain'),
});

export function WebsiteEditForm({ websiteId, onSave }: { websiteId: string; onSave?: () => void }) {
  const website = useWebsite();
  const { formatMessage, labels, messages } = useMessages();
  const { mutateAsync, isPending, touch, toast } = useUpdateQuery(`/websites/${websiteId}`);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      domain: '',
    },
  });

  useEffect(() => {
    if (website) {
      form.reset({
        name: website.name,
        domain: website.domain,
      });
    }
  }, [website, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await mutateAsync(values, {
      onSuccess: async () => {
        toast(formatMessage(messages.saved));
        touch('websites');
        touch(`website:${website.id}`);
        onSave?.();
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormItem>
          <FormLabel>{formatMessage(labels.websiteId)}</FormLabel>
          <FormControl>
            <Input value={website?.id} readOnly className="bg-zinc-50 dark:bg-zinc-900/50 dark:border-zinc-800" />
          </FormControl>
        </FormItem>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{formatMessage(labels.name)}</FormLabel>
              <FormControl>
                <Input {...field} className="dark:bg-[#18181b] dark:border-zinc-800" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{formatMessage(labels.domain)}</FormLabel>
              <FormControl>
                <Input {...field} className="dark:bg-[#18181b] dark:border-zinc-800" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-start pt-4">
          <Button type="submit" disabled={isPending} className="bg-[#5e5ba4] hover:bg-[#5e5ba4]/90 text-white">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {formatMessage(labels.save)}
          </Button>
        </div>
      </form>
    </Form>
  );
}
