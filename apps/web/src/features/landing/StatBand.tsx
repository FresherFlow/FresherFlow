import { Odometer } from './Odometer';

/**
 * Dark instrument band under the hero — matches the accepted mock exactly:
 * always-dark navy band (#0e1420 family) in BOTH themes, 4 odometer counters
 * in a hairline-divided grid (1px gaps via bg trick), mono uppercase labels.
 */

export interface StatBandData {
    total: number;
    internships: number;
    walkins: number;
    companies: number;
}

export function StatBand({ data }: { data: StatBandData }) {
    const stats = [
        { value: data.total, label: 'Openings live on the board', sub: 'Jobs, internships, walk-ins & govt' },
        { value: data.internships, label: 'Internships', sub: 'Across every major city' },
        { value: data.walkins, label: 'Walk-in drives', sub: 'Direct interviews, no gatekeeping' },
        { value: data.companies, label: 'Companies hiring', sub: 'From startups to public sector' },
    ];

    return (
        <section className="ff-band border-y border-[#2a3448]">
            <div className="mx-auto max-w-[1120px] px-6 py-14">
                <div className="mt-7 grid grid-cols-1 gap-px border border-[#2a3448] bg-[#2a3448] sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((s) => (
                        <div key={s.label} className="flex flex-col gap-2 bg-[#0e1420] px-6 pb-6 pt-7">
                            <Odometer
                                value={s.value}
                                className="font-record text-[clamp(34px,4.6vw,52px)] font-semibold leading-none tracking-[-0.02em]"
                            />
                            <div className="ff-band-muted font-record text-[11px] uppercase tracking-[0.12em]">
                                {s.label}
                            </div>
                            <div className="ff-band-muted text-[12.5px]">{s.sub}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
