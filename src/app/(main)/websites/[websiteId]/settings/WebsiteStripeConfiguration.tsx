'use client';

import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMessages } from '@/components/hooks';
import { useToast } from '@umami/react-zen';

import { StripeLogo } from '../StripeConnectPlaceholder';

export function WebsiteStripeConfiguration({ websiteId }: { websiteId: string }) {
    const { formatMessage, labels } = useMessages();
    const { toast } = useToast();

    const {
        control,
        handleSubmit,
        formState: { isSubmitting },
    } = useForm({
        defaultValues: {
            stripeSecretKey: '',
            stripePublishableKey: '',
        },
    });

    const onSubmit = async (data: any) => {
        try {
            const response = await fetch(`/api/websites/${websiteId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('umami.auth')}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to save configuration');
            }

            toast('Stripe configuration saved successfully.');
        } catch (error) {
            console.error(error);
            toast('Failed to save Stripe configuration.');
        }
    };

    return (
        <div className="space-y-6" id="stripe-integration">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <StripeLogo className="h-6 w-auto text-[#635BFF]" />
                    <h3 className="text-lg font-medium">Stripe Integration</h3>
                </div>
                <p className="text-sm text-zinc-400">
                    Connect your Stripe account by adding your Stripe keys to see revenue metrics directly in your dashboard.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                        <Controller
                            name="stripeSecretKey"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    id="stripeSecretKey"
                                    type="password"
                                    placeholder="sk_test_..."
                                    className="max-w-md bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-[#635BFF]"
                                />
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stripePublishableKey">Stripe Publishable Key</Label>
                        <Controller
                            name="stripePublishableKey"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    id="stripePublishableKey"
                                    placeholder="pk_test_..."
                                    className="max-w-md bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-[#635BFF]"
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <Button type="submit" disabled={isSubmitting} className='bg-[#635BFF] hover:bg-[#534be0] text-white'>
                        {isSubmitting ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
