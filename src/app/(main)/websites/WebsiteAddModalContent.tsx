import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUpdateQuery, useMessages, useConfig } from '@/components/hooks';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, Copy, ExternalLink, Loader2, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DOMAIN_REGEX } from '@/lib/constants';

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    domain: z.string()
        .min(1, 'Domain is required')
        .regex(DOMAIN_REGEX, 'Invalid domain'),
});

enum Step {
    FORM = 0,
    VERIFY = 1,
    SUCCESS = 2,
}

export function WebsiteAddModalContent({
    teamId,
    onSave,
    onClose,
}: {
    teamId?: string;
    onSave?: () => void;
    onClose?: () => void;
}) {
    const { formatMessage, labels, messages } = useMessages();
    const { mutateAsync: createWebsite, isPending: isCreating } = useUpdateQuery('/websites', { teamId });
    const [step, setStep] = useState<Step>(Step.FORM);
    const [createdWebsite, setCreatedWebsite] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const config = useConfig();
    const [copiedId, setCopiedId] = useState(false);
    const [copiedScript, setCopiedScript] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            domain: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const data = await createWebsite(values);
            setCreatedWebsite(data);
            setStep(Step.VERIFY);
            onSave?.(); // We call onSave to trigger list refresh, but don't close modal yet
        } catch (error) {
            // Error handled by query hook or global error boundary usually, 
            // but form error handling is better here if needed.
        }
    };

    const getTrackingScript = () => {
        if (!createdWebsite) return '';

        const SCRIPT_NAME = 'script.js';
        const trackerScriptName =
            config?.trackerScriptName?.split(',')?.map((n: string) => n.trim())?.[0] || SCRIPT_NAME;

        const hostUrl = window?.location?.origin || '';

        const url = config?.cloudMode
            ? `${process.env.cloudUrl}/${trackerScriptName}`
            : `${hostUrl}${process.env.basePath || ''}/${trackerScriptName}`;

        const src = trackerScriptName?.startsWith('http') ? trackerScriptName : url;

        return `<script defer src="${src}" data-website-id="${createdWebsite.id}"></script>`;
    };

    const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleVerify = async () => {
        setIsVerifying(true);

        try {
            // Open website in new tab (user convenience)
            const url = createdWebsite.domain.startsWith('http')
                ? createdWebsite.domain
                : `https://${createdWebsite.domain}`;

            window.open(url, '_blank');

            // Wait a moment for the new tab to potentially load (not strictly necessary but good UX pacing)
            await new Promise(r => setTimeout(r, 2000));

            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: createdWebsite.domain,
                    websiteId: createdWebsite.id
                }),
            });

            const data = await response.json();

            if (data.success) {
                setStep(Step.SUCCESS);
                // Confetti logic
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    zIndex: 2147483647,
                });
                setTimeout(() => {
                    confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 2147483647 });
                    confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 2147483647 });
                }, 250);
            } else {
                // Show error (using simple alert or toast if available, here passing via form/state might be complex so utilizing console/alert for now or simple visual feedback)
                alert('Verification failed. We could not find the tracking code on your website. Please ensure you have deployed the changes.');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred during verification.');
        } finally {
            setIsVerifying(false);
        }
    };

    if (step === Step.FORM) {
        return (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-foreground">{formatMessage(labels.name)}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        autoComplete="off"
                                        className="dark:bg-[#18181b] dark:border-zinc-800"
                                    />
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
                                <FormLabel className="text-foreground">{formatMessage(labels.domain)}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        autoComplete="off"
                                        placeholder="example.com"
                                        className="dark:bg-[#18181b] dark:border-zinc-800"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
                        >
                            {formatMessage(labels.cancel)}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isCreating}
                            style={{ backgroundColor: '#5e5ba4', color: 'white' }}
                            className="hover:opacity-90 border-0"
                        >
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {formatMessage(labels.save)}
                        </Button>
                    </div>
                </form>
            </Form>
        );
    }

    if (step === Step.VERIFY) {
        const scriptCode = getTrackingScript();
        const trackingUrl = config?.cloudMode
            ? `${process.env.cloudUrl}/script.js` // simplifying for display if needed
            : `${window?.location?.origin || ''}${process.env.basePath || ''}/script.js`;

        // Simple manual highlighting for the specific script tag structure
        // <script defer src="..." data-website-id="..."></script>

        return (
            <div className="space-y-6">
                <p className="text-muted-foreground text-sm">
                    Add this code to the &lt;head&gt; section of your website.
                </p>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Website ID
                    </label>
                    <div className="flex gap-2">
                        <Input readOnly value={createdWebsite?.id} className="dark:bg-[#18181b] dark:border-zinc-800" />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(createdWebsite?.id, setCopiedId)}
                        >
                            {copiedId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Tracking Code
                    </label>
                    <div className="relative group">
                        <div className="flex min-h-[80px] w-full rounded-md border border-zinc-800 bg-[#18181b] px-3 py-3 text-sm font-mono overflow-x-auto">
                            <code className="text-sm">
                                <span style={{ color: '#89ddff' }}>&lt;script</span>{' '}
                                <span style={{ color: '#c792ea' }}>defer</span>{' '}
                                <span style={{ color: '#c792ea' }}>src</span>
                                <span style={{ color: '#89ddff' }}>=</span>
                                <span style={{ color: '#c3e88d' }}>&quot;{trackingUrl}&quot;</span>{' '}
                                <span style={{ color: '#c792ea' }}>data-website-id</span>
                                <span style={{ color: '#89ddff' }}>=</span>
                                <span style={{ color: '#c3e88d' }}>&quot;{createdWebsite?.id}&quot;</span>
                                <span style={{ color: '#89ddff' }}>&gt;&lt;/script&gt;</span>
                            </code>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(scriptCode, setCopiedScript)}
                        >
                            {copiedScript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleVerify}
                        disabled={isVerifying}
                        style={{ backgroundColor: '#5e5ba4', color: 'white' }}
                        className="hover:opacity-90 border-0"
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                Verify Installation
                                <ExternalLink className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    // Success Step
    return (
        <div className="flex flex-col items-center justify-center space-y-6 py-6 fade-in animate-in">
            <div className="rounded-full bg-green-100 p-3">
                <PartyPopper className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-lg font-medium">Installation Verified!</h3>
                <p className="text-muted-foreground text-sm max-w-[280px]">
                    We successfully detected data from your website. You are all set!
                </p>
            </div>
            <Button
                className="w-full hover:opacity-90 border-0"
                style={{ backgroundColor: '#5e5ba4', color: 'white' }}
                onClick={onClose}
            >
                Go to Website Dashboard
            </Button>
        </div>
    );
}
