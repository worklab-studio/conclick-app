'use client';

import { useLoginQuery } from '@/components/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown, Sparkles, ExternalLink, Calendar, ArrowRight } from 'lucide-react';
import { PLANS } from '@/lib/lemonsqueezy';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

export function BillingPage() {
    const { user } = useLoginQuery();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isAnnual, setIsAnnual] = useState(false);

    const currentPlan = user?.subscriptionPlan || 'free';
    const subscriptionStatus = user?.subscriptionStatus || 'inactive';
    const isTrialing = subscriptionStatus === 'trialing' || subscriptionStatus === 'on_trial';
    const isActive = subscriptionStatus === 'active' || isTrialing;

    const handleUpgrade = async (plan: 'monthly' | 'annual' | 'lifetime') => {
        setIsLoading(plan);
        try {
            const response = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
            });

            if (!response.ok) {
                throw new Error('Failed to create checkout');
            }

            const { url } = await response.json();
            window.location.href = url;
        } catch (error) {
            toast.error('Failed to start checkout. Please try again.');
            console.error('Checkout error:', error);
        } finally {
            setIsLoading(null);
        }
    };

    const handleManageSubscription = async () => {
        setIsLoading('manage');
        try {
            const response = await fetch('/api/billing/portal', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to get portal URL');
            }

            const { url } = await response.json();
            window.open(url, '_blank');
        } catch (error) {
            toast.error('Failed to open billing portal.');
            console.error('Portal error:', error);
        } finally {
            setIsLoading(null);
        }
    };

    const selectedPlan = isAnnual ? PLANS.annual : PLANS.monthly;
    const selectedPlanType = isAnnual ? 'annual' : 'monthly';

    return (
        <div className="w-full">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing</h1>
                        <p className="text-muted-foreground mt-1">Choose the plan that works best for you</p>
                    </div>

                    {/* Billing Toggle - Tab Style */}
                    <div className="relative flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 h-10 w-fit">
                        {/* Monthly Tab */}
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={cn(
                                "flex items-center px-4 rounded-md text-sm font-medium transition-all duration-200 relative z-10",
                                !isAnnual ? "text-white bg-zinc-800 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Monthly
                        </button>

                        {/* Annual Tab */}
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={cn(
                                "flex items-center gap-2 px-4 rounded-md text-sm font-medium transition-all duration-200 relative z-10",
                                isAnnual ? "text-white bg-zinc-800 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Yearly
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">
                                SAVE 20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Two Pricing Cards Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Unlimited Plan Card */}
                    <Card className={cn(
                        "flex flex-col relative transition-all duration-300 bg-zinc-900/40 border-zinc-800 hover:border-zinc-700",
                        (currentPlan === 'monthly' || currentPlan === 'annual') && isActive && "ring-1 ring-indigo-500 border-indigo-500/50"
                    )}>
                        <CardContent className="p-8 flex-1 flex flex-col">
                            {/* Header */}
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-sm font-medium text-zinc-400">{selectedPlan.name}</span>
                                    <span className="text-[10px] uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-sm font-semibold">
                                        14-day trial
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    Everything you need.
                                </h3>
                                <p className="text-zinc-500 text-sm">Perfect for growing businesses.</p>
                            </div>

                            {/* Price */}
                            <div className="mb-8">
                                <span className="text-5xl font-bold text-white tracking-tight">{selectedPlan.price}</span>
                                <span className="text-zinc-500 ml-1">{selectedPlan.priceDetail}</span>
                            </div>

                            {/* CTA Button */}
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-12 mb-8"
                                disabled={isLoading === selectedPlanType || ((currentPlan === 'monthly' || currentPlan === 'annual') && isActive)}
                                onClick={() => handleUpgrade(selectedPlanType)}
                            >
                                {isLoading === selectedPlanType ? 'Loading...' :
                                    (currentPlan === 'monthly' || currentPlan === 'annual') && isActive ? 'Current Plan' : 'Start Free Trial'}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>

                            {/* Features */}
                            <div className="space-y-3 mt-auto">
                                {selectedPlan.features.map((feature) => (
                                    <div key={feature} className="flex items-center gap-3 text-sm text-zinc-400">
                                        <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lifetime Plan Card */}
                    <Card className={cn(
                        "flex flex-col relative transition-all duration-300 bg-zinc-950 border-zinc-800 hover:border-zinc-700",
                        currentPlan === 'lifetime' && "ring-1 ring-yellow-500 border-yellow-500/50"
                    )}>
                        <CardContent className="p-8 flex-1 flex flex-col">
                            {/* Header */}
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <Crown className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm font-medium text-yellow-500">{PLANS.lifetime.name}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    Pay once, use forever.
                                </h3>
                                <p className="text-zinc-500 text-sm">One-time purchase, forever access.</p>
                            </div>

                            {/* Price */}
                            <div className="mb-8">
                                <span className="text-5xl font-bold text-white tracking-tight">{PLANS.lifetime.price}</span>
                                <span className="text-zinc-500 ml-1">{PLANS.lifetime.priceDetail}</span>
                            </div>

                            {/* CTA Button */}
                            <Button
                                className="w-full bg-white hover:bg-zinc-200 text-black font-semibold h-12 mb-8"
                                disabled={isLoading === 'lifetime' || currentPlan === 'lifetime'}
                                onClick={() => handleUpgrade('lifetime')}
                            >
                                {isLoading === 'lifetime' ? 'Loading...' :
                                    currentPlan === 'lifetime' ? 'Lifetime Access' : 'Get Lifetime Access'}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>

                            {/* Features */}
                            <div className="space-y-3 mt-auto">
                                {PLANS.lifetime.features.map((feature) => (
                                    <div key={feature} className="flex items-center gap-3 text-sm text-zinc-400">
                                        <Check className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Enterprise Card - Full Width */}
                <Card className="bg-zinc-900/20 border-zinc-800 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row md:items-stretch">
                            {/* Left Side - Text */}
                            <div className="flex-1 p-8 md:p-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-sm font-medium text-zinc-400">Enterprise</span>
                                    <span className="text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-sm font-semibold">
                                        Custom pricing
                                    </span>
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-3">
                                    Need something more?
                                </h3>
                                <p className="text-zinc-500 max-w-lg leading-relaxed">
                                    Custom solutions for teams with specific needs. Get dedicated support, custom integrations, and more.
                                </p>
                            </div>

                            {/* Right Side - CTA with Profile */}
                            <div className="flex-shrink-0 p-8 md:p-10 md:border-l border-t md:border-t-0 border-zinc-800 bg-zinc-900/40 flex items-center justify-center md:justify-end">
                                <div className="flex items-center gap-8">
                                    {/* Profile */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20 ring-2 ring-zinc-900">
                                            DY
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">Deepak Yadav</p>
                                            <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                                <Calendar className="h-3 w-3" />
                                                30 Min Call
                                            </p>
                                        </div>
                                    </div>

                                    {/* Book Call Button */}
                                    <Button
                                        variant="outline"
                                        className="h-10 border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white text-zinc-300"
                                        onClick={() => window.open('https://cal.com/deepak', '_blank')}
                                    >
                                        Book a Call
                                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Billing Portal Link */}
                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleManageSubscription}
                        disabled={isLoading === 'manage'}
                        className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition-colors"
                    >
                        {isLoading === 'manage' ? (
                            <span>Loading...</span>
                        ) : (
                            <>
                                <span>Manage your subscription on Lemon Squeezy</span>
                                <ExternalLink className="h-3 w-3" />
                            </>
                        )}
                    </button>
                </div>

                {/* Current Plan Status (if active) */}
                {isActive && (
                    <div className="flex items-center justify-between py-4 px-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <div className="flex items-center gap-3">
                            <Crown className="h-5 w-5 text-indigo-500" />
                            <div>
                                <p className="font-medium text-foreground">
                                    Current Plan: {currentPlan === 'lifetime' ? 'Lifetime' : 'Unlimited'}
                                </p>
                                {currentPlan !== 'lifetime' && user?.subscriptionEndsAt && (
                                    <p className="text-sm text-muted-foreground">
                                        {isTrialing ? 'Trial ends' : 'Renews'}: {new Date(user.subscriptionEndsAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                        {currentPlan !== 'lifetime' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleManageSubscription}
                                disabled={isLoading === 'manage'}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {isLoading === 'manage' ? 'Loading...' : 'Manage'}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
