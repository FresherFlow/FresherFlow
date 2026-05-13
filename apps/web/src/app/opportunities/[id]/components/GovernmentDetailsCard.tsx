import { GovernmentJobDetails } from '@fresherflow/types';

interface GovernmentDetailsCardProps {
    details: GovernmentJobDetails;
    tags?: string[];
}

const labelClass = 'text-[11px] font-bold uppercase tracking-widest text-muted-foreground';
const valueClass = 'text-sm md:text-base font-medium text-foreground';

export function GovernmentDetailsCard({ details, tags = [] }: GovernmentDetailsCardProps) {
    const infoPairs = [
        { label: 'Department', value: details.department },
        { label: 'Organization', value: details.organization },
        { label: 'Recruiting Body', value: details.recruitingBody },
        { label: 'Advertisement', value: details.advertisementNumber },
        { label: 'Post Name', value: details.postName },
        { label: 'Application Mode', value: details.applicationMode },
        { label: 'Vacancies', value: details.vacancyCount != null ? String(details.vacancyCount) : '' },
        {
            label: 'Age Limit',
            value: details.ageMin != null || details.ageMax != null
                ? `${details.ageMin ?? '?'} - ${details.ageMax ?? '?'} years`
                : '',
        },
        { label: 'Exam Date', value: details.examDate },
    ].filter((item) => item.value);

    const importantTags = Array.from(new Set([...(tags || []), ...(details.seoTags || [])])).slice(0, 8);

    return (
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-4">
            <div className="space-y-1">
                <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground">Government Snapshot</h3>
                <p className="text-sm text-muted-foreground">Official-notice metadata, fee, dates, and category instructions for this government opening.</p>
            </div>

            {importantTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {importantTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {infoPairs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {infoPairs.map((item) => (
                        <div key={item.label} className="space-y-1">
                            <p className={labelClass}>{item.label}</p>
                            <p className={valueClass}>{item.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {(details.applicationStartDate || details.applicationEndDate || details.admitCardDate || details.resultDate) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {details.applicationStartDate && (
                        <div className="space-y-1">
                            <p className={labelClass}>Application Start</p>
                            <p className={valueClass}>{details.applicationStartDate}</p>
                        </div>
                    )}
                    {details.applicationEndDate && (
                        <div className="space-y-1">
                            <p className={labelClass}>Application End</p>
                            <p className={valueClass}>{details.applicationEndDate}</p>
                        </div>
                    )}
                    {details.admitCardDate && (
                        <div className="space-y-1">
                            <p className={labelClass}>Admit Card</p>
                            <p className={valueClass}>{details.admitCardDate}</p>
                        </div>
                    )}
                    {details.resultDate && (
                        <div className="space-y-1">
                            <p className={labelClass}>Result</p>
                            <p className={valueClass}>{details.resultDate}</p>
                        </div>
                    )}
                </div>
            )}

            {details.applicationFee && (
                <div className="space-y-1">
                    <p className={labelClass}>Application Fee</p>
                    <p className={valueClass}>{details.applicationFee}</p>
                </div>
            )}

            {details.applicationModes && details.applicationModes.length > 0 && (
                <div className="space-y-1">
                    <p className={labelClass}>Application Modes</p>
                    <p className={valueClass}>{details.applicationModes.join(', ')}</p>
                </div>
            )}

            {details.applicationFeeDetails && (
                <div className="space-y-2">
                    <p className={labelClass}>Application Fee Breakdown</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(details.applicationFeeDetails)
                            .filter(([, value]) => value !== undefined && value !== null)
                            .flatMap(([key, value]) => {
                                if (key === 'other' && value && typeof value === 'object') {
                                    return Object.entries(value as Record<string, number>).map(([nestedKey, nestedValue]) => ({
                                        key: nestedKey,
                                        value: nestedValue,
                                    }));
                                }
                                return [{ key, value: value as number }];
                            })
                            .map((entry) => (
                                <div key={entry.key} className="rounded-lg border border-border px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{entry.key}</p>
                                    <p className="text-sm font-semibold text-foreground">
                                        {entry.value === 0 ? 'Free' : `Rs. ${entry.value}`}
                                    </p>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {details.vacancies && details.vacancies.length > 0 && (
                <div className="space-y-3">
                    <p className={labelClass}>Post-wise Vacancies</p>
                    <div className="space-y-3">
                        {details.vacancies.map((vacancy) => (
                            <div key={`${vacancy.postName}-${vacancy.total ?? ''}`} className="rounded-lg border border-border p-3 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm md:text-base font-semibold text-foreground">{vacancy.postName}</p>
                                    {vacancy.total != null && <p className="text-sm font-medium text-muted-foreground">{vacancy.total} posts</p>}
                                </div>
                                {vacancy.categoryBreakup && Object.keys(vacancy.categoryBreakup).length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(vacancy.categoryBreakup).map(([category, count]) => (
                                            <span key={category} className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground/80">
                                                {category}: {count}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {(vacancy.qualification || vacancy.age) && (
                                    <div className="space-y-1 text-sm text-foreground/85">
                                        {vacancy.qualification && <p>Qualification: {vacancy.qualification}</p>}
                                        {vacancy.age && <p>Age: {vacancy.age}</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {details.examDates && Object.keys(details.examDates).length > 0 && (
                <div className="space-y-2">
                    <p className={labelClass}>Exam Timeline</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(details.examDates)
                            .filter(([, value]) => Boolean(value))
                            .map(([stage, value]) => (
                                <div key={stage} className="space-y-1">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{stage}</p>
                                    <p className={valueClass}>{value}</p>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {details.eligibilityDetails && (
                <div className="space-y-2">
                    <p className={labelClass}>Eligibility Details</p>
                    <div className="space-y-2 text-sm md:text-base text-foreground/90">
                        {details.eligibilityDetails.education && details.eligibilityDetails.education.length > 0 && (
                            <div>
                                <p className="font-semibold text-foreground">Education</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    {details.eligibilityDetails.education.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                        {details.eligibilityDetails.age && (
                            <div>
                                <p className="font-semibold text-foreground">Age</p>
                                <p>
                                    {details.eligibilityDetails.age.min ?? '?'} - {details.eligibilityDetails.age.max ?? '?'} years
                                    {details.eligibilityDetails.age.notes ? ` (${details.eligibilityDetails.age.notes})` : ''}
                                </p>
                            </div>
                        )}
                        {details.eligibilityDetails.additional && details.eligibilityDetails.additional.length > 0 && (
                            <div>
                                <p className="font-semibold text-foreground">Additional</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    {details.eligibilityDetails.additional.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {details.selectionStages && details.selectionStages.length > 0 && (
                <div className="space-y-2">
                    <p className={labelClass}>Selection Stages</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm md:text-base text-foreground/90">
                        {details.selectionStages.map((stage) => (
                            <li key={stage}>{stage}</li>
                        ))}
                    </ul>
                </div>
            )}

            {details.requiredDocuments && details.requiredDocuments.length > 0 && (
                <div className="space-y-2">
                    <p className={labelClass}>Required Documents</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm md:text-base text-foreground/90">
                        {details.requiredDocuments.map((doc) => (
                            <li key={doc}>{doc}</li>
                        ))}
                    </ul>
                </div>
            )}

            {details.requiredDocumentDetails && details.requiredDocumentDetails.length > 0 && (
                <div className="space-y-2">
                    <p className={labelClass}>Document Checklist</p>
                    <div className="space-y-2">
                        {details.requiredDocumentDetails.map((doc) => (
                            <div key={doc.name} className="rounded-lg border border-border px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        {doc.mandatory ? 'Mandatory' : 'Conditional'}
                                    </span>
                                </div>
                                {doc.notes && <p className="mt-1 text-sm text-foreground/75">{doc.notes}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(details.ageRelaxation || details.reservationNotes || details.importantInstructions) && (
                <div className="space-y-3">
                    {details.ageRelaxation && (
                        <div className="space-y-1">
                            <p className={labelClass}>Age Relaxation</p>
                            <p className={valueClass}>{details.ageRelaxation}</p>
                        </div>
                    )}
                    {details.reservationNotes && (
                        <div className="space-y-1">
                            <p className={labelClass}>Reservation Notes</p>
                            <p className={valueClass}>{details.reservationNotes}</p>
                        </div>
                    )}
                    {details.importantInstructions && (
                        <div className="space-y-1">
                            <p className={labelClass}>Important Instructions</p>
                            <p className={valueClass}>{details.importantInstructions}</p>
                        </div>
                    )}
                </div>
            )}

            {(details.officialNotificationUrl || details.officialWebsiteUrl) && (
                <div className="flex flex-wrap gap-3 pt-1">
                    {details.officialNotificationUrl && (
                        <a href={details.officialNotificationUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">
                            Official Notification
                        </a>
                    )}
                    {details.officialWebsiteUrl && (
                        <a href={details.officialWebsiteUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">
                            Official Website
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
