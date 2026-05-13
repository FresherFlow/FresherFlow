import { Opportunity } from '@fresherflow/types';

interface GovernmentOpportunityOverviewProps {
    opp: Opportunity;
}

const sectionTitleClass = 'text-xs md:text-sm font-bold uppercase tracking-[0.18em] text-slate-600';

export function GovernmentOpportunityOverview({ opp }: GovernmentOpportunityOverviewProps) {
    const details = opp.governmentJobDetails;
    if (!details) return null;

    const education = details.eligibilityDetails?.education || [];
    const additional = details.eligibilityDetails?.additional || [];
    const ageLabel = details.eligibilityDetails?.age
        ? `${details.eligibilityDetails.age.min ?? details.ageMin ?? '?'} - ${details.eligibilityDetails.age.max ?? details.ageMax ?? '?'} years`
        : details.ageMin != null || details.ageMax != null
            ? `${details.ageMin ?? '?'} - ${details.ageMax ?? '?'} years`
            : null;

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg md:text-2xl font-bold tracking-tight text-slate-950">Eligibility Snapshot</h3>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                        Govt recruitment
                    </span>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-slate-50 px-4 py-4 border border-slate-200">
                        <p className={sectionTitleClass}>Education</p>
                        <div className="mt-2 space-y-1 text-sm md:text-base text-slate-900">
                            {education.length > 0 ? education.map((item) => <p key={item}>{item}</p>) : <p>Check official notification</p>}
                        </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-4 border border-slate-200">
                        <p className={sectionTitleClass}>Age Bracket</p>
                        <p className="mt-2 text-lg font-bold text-slate-950">{ageLabel || 'As per notice'}</p>
                        {details.eligibilityDetails?.age?.notes && (
                            <p className="mt-1 text-sm text-slate-600">{details.eligibilityDetails.age.notes}</p>
                        )}
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-4 border border-slate-200">
                        <p className={sectionTitleClass}>Application Mode</p>
                        <p className="mt-2 text-lg font-bold text-slate-950">
                            {details.applicationModes && details.applicationModes.length > 0
                                ? details.applicationModes.join(', ')
                                : details.applicationMode || 'Check notice'}
                        </p>
                        {details.ageRelaxation && (
                            <p className="mt-1 text-sm text-slate-600">{details.ageRelaxation}</p>
                        )}
                    </div>
                </div>
            </section>

            {details.selectionStages && details.selectionStages.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <h3 className="text-lg md:text-2xl font-bold tracking-tight text-slate-950">Selection Flow</h3>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                        {details.selectionStages.map((stage, index) => (
                            <div key={stage} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center">
                                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-800">
                                    {index + 1}
                                </div>
                                <p className="mt-3 text-sm font-semibold leading-snug text-slate-900">{stage}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {(opp.requiredSkills.length > 0 || additional.length > 0) && (
                <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <h3 className="text-lg md:text-2xl font-bold tracking-tight text-slate-950">Readiness Signals</h3>
                    <div className="mt-4 space-y-4">
                        {opp.requiredSkills.length > 0 && (
                            <div>
                                <p className={sectionTitleClass}>Key Skills</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {opp.requiredSkills.map((skill) => (
                                        <span key={skill} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 border border-blue-100">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {additional.length > 0 && (
                            <div>
                                <p className={sectionTitleClass}>Additional Notes</p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm md:text-base text-slate-900">
                                    {additional.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
