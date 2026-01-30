'use client';

import { useState } from 'react';
import { useApi } from '@/components/hooks/useApi';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BellRing, Send } from 'lucide-react';

export default function NotificationsPage() {
    const { post } = useApi();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'info'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (value: string) => {
        setFormData({ ...formData, type: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.title || !formData.message) {
            toast.error('Title and message are required.');
            setLoading(false);
            return;
        }

        try {
            await post('/admin/notifications', formData);
            toast.success('Notification broadcasted successfully!');
            setFormData({ title: '', message: '', type: 'info' }); // Reset form
        } catch (e) {
            toast.error('Failed to send notification.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <BellRing className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Broadcast Center</h1>
                    <p className="text-muted-foreground text-sm">Send instant alerts to all active users.</p>
                </div>
            </div>

            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">New Notification</CardTitle>
                    <CardDescription>
                        This message will be sent to <strong>all users</strong> immediately.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="title" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                Notification Title
                            </Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="e.g., Scheduled Maintenance Update"
                                value={formData.title}
                                onChange={handleChange}
                                className="h-11 bg-background/50 border-input/60 focus:border-indigo-500/50 transition-all font-medium"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="type" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                Alert Level
                            </Label>
                            <Select value={formData.type} onValueChange={handleSelectChange}>
                                <SelectTrigger className="h-11 bg-background/50 border-input/60">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="info">ℹ️ Info (General updates)</SelectItem>
                                    <SelectItem value="success">✅ Success (Milestones, Features)</SelectItem>
                                    <SelectItem value="warning">⚠️ Warning (Maintenance, Issues)</SelectItem>
                                    <SelectItem value="alert">🚨 Alert (Critical updates)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="message" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                Message Content
                            </Label>
                            <Textarea
                                id="message"
                                name="message"
                                placeholder="Write your message here..."
                                value={formData.message}
                                onChange={handleChange}
                                className="min-h-[150px] bg-background/50 border-input/60 focus:border-indigo-500/50 resize-y p-4 leading-relaxed"
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="min-w-[150px] h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                            >
                                {loading ? (
                                    'Broadcasting...'
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" /> Send Broadcast
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
