import { cn } from '@/lib/utils/utils';
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

function DiscordBrandIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
        </svg>
    );
}

export function Footer({ className }: FooterProps) {
    const currentYear = new Date().getFullYear();

    const topCategories = [
        { href: '/government-jobs', label: 'Government Jobs' },
        { href: '/jobs', label: 'Off-Campus Drives' },
        { href: '/walk-ins', label: 'Walk-in Interviews' },
        { href: '/internships', label: 'Student Internships' },
    ];

    const resources = [
        { href: '/blog', label: 'Career Blog' },
        { href: '/sitemap.xml', label: 'Sitemap' },
    ];

    const company = [
        { href: '/about', label: 'About FresherFlow' },
        { href: '/contact', label: 'Contact Us' },
        { href: '/feedback', label: 'Provide Feedback' },
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
    ];

    const socialLinks = [
        { href: 'https://t.me/fresherflowin', label: 'Telegram', Icon: TelegramBrandIcon, colorClass: 'text-[#229ED9] bg-[#229ED9]/10 border-[#229ED9]/20 hover:bg-[#229ED9] hover:text-white' },
        { href: 'https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D', label: 'WhatsApp', Icon: WhatsAppBrandIcon, colorClass: 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/20 hover:bg-[#25D366] hover:text-white' },
        { href: 'https://www.linkedin.com/company/fresherflow-in', label: 'LinkedIn', Icon: LinkedInBrandIcon, colorClass: 'text-[#0A66C2] bg-[#0A66C2]/10 border-[#0A66C2]/20 hover:bg-[#0A66C2] hover:text-white' },
        { href: 'https://x.com/Fresherflow', label: 'X', Icon: XBrandIcon, colorClass: 'text-foreground bg-foreground/10 border-foreground/20 hover:bg-foreground hover:text-background' },
        { href: 'https://discord.gg/CcPAnWSHD', label: 'Discord', Icon: DiscordBrandIcon, colorClass: 'text-[#5865F2] bg-[#5865F2]/10 border-[#5865F2]/20 hover:bg-[#5865F2] hover:text-white' },
        { href: 'https://instagram.com/fresherflow', label: 'Instagram', Icon: InstagramBrandIcon, colorClass: 'text-[#E1306C] bg-[#E1306C]/10 border-[#E1306C]/20 hover:bg-[#E1306C] hover:text-white' },
        { href: 'https://www.facebook.com/FresherFlow.in', label: 'Facebook', Icon: FacebookBrandIcon, colorClass: 'text-[#1877F2] bg-[#1877F2]/10 border-[#1877F2]/20 hover:bg-[#1877F2] hover:text-white' },
    ];

    return (
        <footer className={cn("bg-card border-t border-border mt-auto", className)}>
            {/* Top Footer */}
            <div className="container px-4 md:px-6 mx-auto py-10 md:py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 lg:gap-8">
                    
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-4 lg:col-span-2 space-y-6">
                        <div>
                            <Link href="/" className="inline-block">
                                <span className="text-2xl font-black tracking-tighter text-primary">FresherFlow<span className="text-foreground">.in</span></span>
                            </Link>
                            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-sm">
                                Your ultimate destination for Government Jobs, Off-Campus Drives, and Walk-in Interviews. We empower job seekers with verified, up-to-date career opportunities.
                            </p>
                        </div>
                        
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Connect With Us</h4>
                            <div className="flex flex-wrap gap-2.5">
                                {socialLinks.map(({ href, label, Icon, colorClass }) => (
                                    <a
                                        key={label}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className={cn(
                                            "h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-300",
                                            colorClass
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-foreground">Opportunities</h4>
                        <ul className="space-y-2">
                            {topCategories.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-foreground">Resources</h4>
                        <ul className="space-y-2">
                            {resources.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-foreground">FresherFlow</h4>
                        <ul className="space-y-2">
                            {company.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                </div>
            </div>

            {/* Bottom Footer */}
            <div className="border-t border-border bg-muted/20">
                <div className="container px-4 md:px-6 mx-auto py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                        <p className="text-sm text-muted-foreground">
                            &copy; {currentYear} FresherFlow.in. All rights reserved.
                        </p>
                        <p className="text-xs text-muted-foreground max-w-xl md:text-right">
                            <span className="font-semibold text-foreground">Disclaimer:</span> We aggregate information from official sources for educational purposes. We are not affiliated with any government organization.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
