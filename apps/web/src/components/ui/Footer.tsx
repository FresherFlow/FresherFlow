import { cn } from '@/lib/utils';
import Link from 'next/link';

interface FooterProps {
    className?: string;
}

type IconProps = { className?: string };

function TelegramBrandIcon({ className }: IconProps) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M9.036 15.803 8.87 19.5c.45 0 .646-.194.88-.427l2.112-2.018 4.38 3.207c.803.444 1.37.21 1.586-.743L20.8 5.59c.316-1.237-.447-1.72-1.227-1.43L2.59 10.72c-1.159.45-1.141 1.098-.197 1.39l4.344 1.356L16.824 7.15c.475-.29.91-.129.555.16L9.036 15.803z" /></svg>;
}

function WhatsAppBrandIcon({ className }: IconProps) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M20.52 3.48A11.88 11.88 0 0 0 12.06 0C5.49 0 .15 5.34.15 11.91c0 2.1.55 4.15 1.6 5.97L0 24l6.32-1.66a11.83 11.83 0 0 0 5.73 1.46h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.45-8.4zM12.06 21.7h-.01a9.79 9.79 0 0 1-4.98-1.36l-.36-.22-3.75.99.99-3.65-.24-.37a9.79 9.79 0 0 1-1.51-5.2c0-5.4 4.39-9.79 9.8-9.79 2.61 0 5.06 1.01 6.9 2.86a9.72 9.72 0 0 1 2.88 6.92c0 5.4-4.4 9.8-9.72 9.8zm5.37-7.35c-.29-.15-1.7-.84-1.97-.93-.26-.1-.45-.15-.64.15-.19.29-.74.93-.9 1.12-.17.2-.33.22-.62.08-.29-.15-1.22-.45-2.33-1.43-.86-.77-1.43-1.72-1.6-2-.17-.29-.02-.44.13-.59.13-.13.29-.34.44-.5.15-.17.2-.29.3-.49.1-.2.05-.37-.03-.52-.08-.15-.64-1.55-.88-2.13-.23-.55-.47-.48-.64-.49h-.54c-.2 0-.52.07-.79.37-.27.3-1.03 1.01-1.03 2.45s1.06 2.83 1.2 3.02c.15.2 2.08 3.18 5.04 4.46.7.3 1.25.49 1.68.63.7.22 1.34.19 1.84.11.56-.08 1.7-.7 1.95-1.38.24-.67.24-1.25.17-1.37-.08-.12-.27-.2-.56-.34z" /></svg>;
}

function LinkedInBrandIcon({ className }: IconProps) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001A2.5 2.5 0 0 1 4.98 3.5zM3 8.98h3.96V21H3V8.98zm7.02 0h3.8v1.64h.05c.53-1 1.82-2.06 3.75-2.06 4 0 4.74 2.64 4.74 6.08V21h-3.96v-5.6c0-1.34-.03-3.06-1.86-3.06-1.86 0-2.15 1.45-2.15 2.96V21h-3.97V8.98z" /></svg>;
}

function XBrandIcon({ className }: IconProps) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M18.9 2H22l-6.77 7.74L23 22h-6.17l-4.84-6.31L6.42 22H3.3l7.24-8.27L1 2h6.32l4.37 5.76L18.9 2zm-1.08 18h1.71L6.35 3.9H4.5L17.82 20z" /></svg>;
}

function InstagramBrandIcon({ className }: IconProps) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5zM12 7.3a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4zm0 1.8a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8zm5.35-2.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z" /></svg>;
}

function FacebookBrandIcon({ className }: IconProps) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.87.25-1.46 1.5-1.46h1.6V5a19 19 0 0 0-2.3-.12c-2.28 0-3.84 1.39-3.84 3.95V11H8v3h2.4v8h3.1z" /></svg>;
}

export function Footer({ className }: FooterProps) {
    const currentYear = new Date().getFullYear();
    const socialLinks = [
        { href: 'https://t.me/fresherflowin', label: 'Telegram', Icon: TelegramBrandIcon },
        { href: 'https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D', label: 'WhatsApp', Icon: WhatsAppBrandIcon },
        { href: 'https://www.linkedin.com/company/fresherflow-in', label: 'LinkedIn', Icon: LinkedInBrandIcon },
        { href: 'https://twitter.com/Fresherflow', label: 'X', Icon: XBrandIcon },
        { href: 'https://instagram.com/fresherflow', label: 'Instagram', Icon: InstagramBrandIcon },
        { href: 'https://www.facebook.com/FresherFlow.in', label: 'Facebook', Icon: FacebookBrandIcon },
    ] as const;

    return (
        <footer className={cn("border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-6 md:py-8 mt-auto", className)}>
            <div className="container px-4 md:px-6 flex flex-col items-center justify-center gap-4 text-center mx-auto">
                <p className="text-xs text-muted-foreground">
                    &copy; {currentYear} FresherFlow. All rights reserved.
                </p>
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                    <span className="text-muted-foreground/40">|</span>
                    <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                    <span className="text-muted-foreground/40">|</span>
                    <Link href="/account/feedback" className="hover:text-foreground transition-colors">Feedback</Link>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {socialLinks.map(({ href, label, Icon }) => (
                        <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={label}
                            className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                        >
                            <Icon className="h-4 w-4" />
                        </a>
                    ))}
                </div>
                <div className="text-xs text-muted-foreground/60 max-w-md space-y-1">
                    <p>
                        Company names and logos are trademarks of their respective owners.
                        FresherFlow is not affiliated with or endorsed by these companies.
                    </p>
                </div>
            </div>
        </footer>
    );
}
