'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { toast } from 'react-hot-toast';
import { PaperAirplaneIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/solid';
import { apiClient } from '@/lib/api/_core';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export default function PushNotificationClient() {
    const searchParams = useSearchParams();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [url, setUrl] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [deviceCount, setDeviceCount] = useState<number | null>(null);

    useEffect(() => {
        apiClient<{ count: number }>('/api/admin/push/devices')
            .then(r => setDeviceCount(r.count))
            .catch(() => setDeviceCount(null));
    }, []);

    useEffect(() => {
        const queryTitle = searchParams.get('title');
        const queryMessage = searchParams.get('message');
        const queryUrl = searchParams.get('url');

        if (queryTitle) setTitle(queryTitle);
        if (queryMessage) setMessage(queryMessage);
        if (queryUrl) setUrl(queryUrl);
    }, [searchParams]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim() || !message.trim()) {
            toast.error('Title and message are required.');
            return;
        }

        setIsSending(true);
        try {
            const result = await adminApi.adminPushApi.sendPush({
                title: title.trim(),
                message: message.trim(),
                url: url.trim() || undefined,
            }) as unknown as { success: boolean; sent?: number; failed?: number; message?: string };

            if (result.sent === 0) {
                toast.error('No registered devices found. Make sure the mobile app is logged in.');
            } else {
                toast.success(`✅ Sent to ${result.sent ?? 1} device${(result.sent ?? 1) > 1 ? 's' : ''}${result.failed ? ` (${result.failed} failed)` : ''}`);
                setTitle('');
                setMessage('');
                setUrl('');
            }
        } catch (error: any) {
            console.error('Failed to send push notification:', error);
            toast.error(error?.message || 'Failed to send push notification');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm">
            {/* Device count badge */}
            <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-muted/50 border border-border text-sm">
                <DevicePhoneMobileIcon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">
                    Registered devices:{' '}
                    {deviceCount === null ? (
                        <span className="text-muted-foreground italic">loading…</span>
                    ) : deviceCount === 0 ? (
                        <span className="text-destructive font-semibold">0 — no devices registered yet</span>
                    ) : (
                        <span className="text-foreground font-semibold">{deviceCount}</span>
                    )}
                </span>
            </div>
            <form onSubmit={handleSend} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                        Notification Title <span className="text-destructive">*</span>
                    </label>
                    <input 
                        type="text" 
                        required
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-foreground"
                        placeholder="e.g. New Job Alert!"
                        maxLength={65}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                        {title.length}/65 characters (Keep it short and catchy)
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                        Message Body <span className="text-destructive">*</span>
                    </label>
                    <textarea 
                        required
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-y transition-colors text-foreground"
                        placeholder="e.g. TCS is hiring for 2024 batch! Apply now..."
                        maxLength={240}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                        {message.length}/240 characters
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                        Deep Link URL (Optional)
                    </label>
                    <input 
                        type="url" 
                        value={url} 
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-foreground"
                        placeholder={`e.g. fresherflow://job/123 or ${new URL(SITE_URL).hostname}/app`}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                        If provided, tapping the notification will open this URL.
                    </p>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                    <button 
                        type="submit" 
                        disabled={isSending || !title.trim() || !message.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {isSending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <PaperAirplaneIcon className="w-4 h-4" />
                                Send Broadcast
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
