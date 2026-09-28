import type { Metadata } from 'next';
import TwoFactorSetup from '@/features/admin/components/TwoFactorSetup';
import PasskeyManager from '@/features/admin/components/PasskeyManager';
import AppearanceSettings from '@/features/admin/components/AppearanceSettings';

export const metadata: Metadata = { title: { absolute: 'Settings | FresherFlow Admin' } };

/**
 * Admin → Settings.
 *
 * Each panel already renders its own heading, description and bordered card, so
 * this page adds no wrapper of its own — an outer card only produced a box
 * inside a box.
 */
export default function AdminSettingsPage() {
    /* No `pt-*`: the shell's content band already reserves the fixed
       MobileTopNav (`AdminLayoutClient.tsx:62` applies `pt-14` below `md`
       and `md:pt-18` up to `lg`). A page-level `pt-16` stacked on top of
       it and left a ~80px empty band on mobile. Bottom padding is only
       for the fixed AdminBottomNav, and `md:pb-8` takes over from `md`. */
    return (
        <div className="flex-1 min-h-0 space-y-8 overflow-y-auto p-4 text-foreground md:p-8 md:pb-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin settings</h1>
                <p className="text-muted-foreground">
                    Manage security, notifications, and account preferences.
                </p>
            </div>

            <div className="grid items-start gap-6 md:grid-cols-2">
                <TwoFactorSetup />
                <PasskeyManager />
            </div>

            <AppearanceSettings />
        </div>
    );
}
