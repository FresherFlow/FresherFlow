'use client';

import Link from 'next/link';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import PaperAirplaneIcon from '@heroicons/react/24/outline/PaperAirplaneIcon';
import ClipboardDocumentCheckIcon from '@heroicons/react/24/outline/ClipboardDocumentCheckIcon';
import ArrowRightOnRectangleIcon from '@heroicons/react/24/outline/ArrowRightOnRectangleIcon';
import { ThemeToggle } from './ThemeToggle';
import type { User } from '@fresherflow/types';

function TelegramIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M12 0C5.371 0 0 5.372 0 12s5.371 12 12 12 12-5.372 12-12S18.629 0 12 0Zm5.861 8.233-1.97 9.294c-.149.657-.538.818-1.088.51l-3.009-2.219-1.451 1.396c-.16.16-.295.295-.603.295l.213-3.049 5.549-5.012c.24-.213-.053-.333-.373-.12L8.27 13.65l-2.957-.922c-.642-.203-.656-.642.135-.949l11.557-4.456c.536-.198 1.006.12.856.91Z" /></svg>;
}
function LinkedInIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M20.447 20.452h-3.554V14.87c0-1.332-.026-3.046-1.858-3.046-1.86 0-2.145 1.45-2.145 2.95v5.678H9.338V9h3.414v1.561h.049c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126ZM7.114 20.452H3.558V9h3.556v11.452ZM22.225 0H1.771C.792 0 0 .773 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .773 23.2 0 22.222 0h.003Z" /></svg>;
}
function XIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.188L24 22.847h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.933ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z" /></svg>;
}
function InstagramIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M7.75 2h8.5A5.756 5.756 0 0 1 22 7.75v8.5A5.756 5.756 0 0 1 16.25 22h-8.5A5.756 5.756 0 0 1 2 16.25v-8.5A5.756 5.756 0 0 1 7.75 2Zm-.25 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm10.75 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /></svg>;
}
function FacebookIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.412c0-3.022 1.792-4.694 4.533-4.694 1.313 0 2.687.236 2.687.236v2.969H15.83c-1.491 0-1.956.928-1.956 1.881v2.26h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" /></svg>;
}
function WhatsAppIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .14 5.34.14 11.92c0 2.1.55 4.16 1.6 5.98L0 24l6.25-1.63a11.84 11.84 0 0 0 5.81 1.49h.01c6.57 0 11.93-5.35 11.93-11.93 0-3.18-1.24-6.17-3.48-8.45ZM12.07 21.8h-.01a9.86 9.86 0 0 1-5.03-1.38l-.36-.22-3.71.97.99-3.62-.24-.37a9.84 9.84 0 0 1-1.5-5.26c0-5.44 4.42-9.87 9.86-9.87 2.63 0 5.1 1.02 6.96 2.9a9.78 9.78 0 0 1 2.89 6.97c0 5.44-4.42 9.88-9.85 9.88Zm5.42-7.41c-.3-.15-1.79-.88-2.07-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-.3-.15-1.25-.46-2.38-1.48a8.96 8.96 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.94-2.24-.25-.6-.5-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.5s1.08 2.9 1.23 3.1c.15.2 2.1 3.2 5.08 4.48.71.3 1.27.48 1.7.61.72.23 1.38.2 1.89.12.58-.09 1.79-.73 2.04-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z" /></svg>;
}

interface MobileNavMenuProps {
    user: User;
    unreadCount: number;
    pendingSyncCount: number;
    onClose: () => void;
}

export default function MobileNavMenu({ user, unreadCount, pendingSyncCount, onClose }: MobileNavMenuProps) {
    const socialLinks = [
        { href: 'https://t.me/fresherflowin', label: 'Telegram', Icon: TelegramIcon },
        { href: 'https://www.linkedin.com/company/fresherflow-in', label: 'LinkedIn', Icon: LinkedInIcon },
        { href: 'https://twitter.com/Fresherflow', label: 'Twitter', Icon: XIcon },
        { href: 'https://instagram.com/fresherflow', label: 'Instagram', Icon: InstagramIcon },
        { href: 'https://www.facebook.com/FresherFlow.in', label: 'Facebook', Icon: FacebookIcon },
        { href: 'https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D', label: 'WhatsApp', Icon: WhatsAppIcon },
    ];

    return (
        <div className="md:hidden fixed inset-0 z-[75] bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
            <button className="absolute inset-0" aria-label="Close menu" onClick={onClose} />
            <div className="relative z-10 bg-card shadow-2xl overflow-y-auto max-h-[calc(100vh-4rem)]">
                <div className="p-4 bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <UserIcon className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold uppercase tracking-tight italic">{user.fullName || 'User Identity'}</h3>
                            <p className="text-xs font-semibold text-muted-foreground uppercase opacity-60 tracking-wider truncate max-w-50">{user.email}</p>
                        </div>
                        <div className="ml-auto"><ThemeToggle /></div>
                    </div>
                </div>
                <nav className="p-3 space-y-1">
                    {[
                        { href: '/profile', label: 'My Profile', icon: UserIcon },
                        { href: '/account/saved', label: 'My Saved', icon: BookmarkIcon },
                        { href: '/account/tracker', label: 'Tracker', icon: ClipboardDocumentCheckIcon },
                        { href: '/alerts', label: 'Alerts', icon: BellIcon },
                        { href: '/account/feedback', label: 'Feedback', icon: PaperAirplaneIcon },
                    ].map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="w-4 h-4 text-primary" />
                                <span>{item.label}</span>
                                {item.href === '/alerts' && unreadCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                                {item.href === '/alerts' && pendingSyncCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                                        {pendingSyncCount > 99 ? '99+' : pendingSyncCount}
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                    <div className="pt-3 mt-3">
                        <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Follow us</p>
                        <div className="flex items-center gap-2 px-3">
                            {socialLinks.map((s) => (
                                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                                    className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40"
                                    aria-label={s.label}>
                                    <s.Icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                    </div>
                    <div className="pt-3 mt-3">
                        <Link href="/logout" onClick={onClose}
                            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-xs font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10 transition-all">
                            <ArrowRightOnRectangleIcon className="w-4 h-4" />
                            <span>Sign Out</span>
                        </Link>
                    </div>
                </nav>
            </div>
        </div>
    );
}
