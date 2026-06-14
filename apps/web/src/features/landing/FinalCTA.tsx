import Link from 'next/link';

export function FinalCTA() {
    return (
        <section className="py-14 px-6 border-t border-border/40 bg-muted/5">
            <div className="max-w-5xl mx-auto text-center space-y-8 rounded-3xl border border-border bg-card/60 backdrop-blur-md p-10 md:p-14 shadow-xl relative overflow-hidden">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                    Stop searching. Start applying.
                </h2>
                <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                    Join thousands of students getting fast, direct redirection to authentic, manual-checked career openings.
                </p>
                <div className="flex justify-center pt-2">
                    <Link href="/app" className="premium-button px-9 text-[12px] uppercase tracking-widest shadow-md">
                        Download App
                    </Link>
                </div>
            </div>
        </section>
    );
}
