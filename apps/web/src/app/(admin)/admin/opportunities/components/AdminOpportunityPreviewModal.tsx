'use client';

import React, { useEffect, useState } from 'react';
import { Opportunity } from '@fresherflow/types';
import { adminApi } from '@/lib/api/admin';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import CompanyLogo from '@/ui/CompanyLogo';
import Link from 'next/link';
import { getOpportunityPathFromItem } from '@/features/opportunities/domain/opportunityPath';
import { getOpportunityDisplaySalary, getGroupedLocations } from '@/features/opportunities/domain/opportunityDisplay';
import { DescriptionSection } from '@/app/[slug]/components/DescriptionSection';
import { WalkInDetailsCard } from '@/app/[slug]/components/WalkInDetailsCard';

interface AdminOpportunityPreviewModalProps {
    show: boolean;
    opportunityId: string | null;
    onClose: () => void;
}

export const AdminOpportunityPreviewModal = ({ show, opportunityId, onClose }: AdminOpportunityPreviewModalProps) => {
    const [opp, setOpp] = useState<Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!show || !opportunityId) {
            setOpp(null);
            setError(null);
            return;
        }

        const fetchDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await adminApi.getOpportunity(opportunityId) as { opportunity: Opportunity };
                if (response?.opportunity) {
                    setOpp(response.opportunity);
                } else {
                    throw new Error('Opportunity data not found');
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to load opportunity preview.';
                setError(msg);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchDetails();
    }, [show, opportunityId]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0 cursor-default" onClick={onClose} />

            <div className="relative w-full max-w-3xl h-[90vh] md:h-[85vh] bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 z-10">

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <ArrowPathIcon className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading preview...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                        <ExclamationTriangleIcon className="w-8 h-8 text-destructive" />
                        <h3 className="text-base font-bold text-foreground">Failed to load preview</h3>
                        <p className="text-xs text-muted-foreground">{error}</p>
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground">
                            Close
                        </button>
                    </div>
                ) : opp ? (
                    <>
                        {/* Header */}
                        <div className="shrink-0 flex items-center justify-between p-4 border-b border-border/40 gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <CompanyLogo
                                    companyName={opp.company}
                                    companyWebsite={opp.companyWebsite}
                                    companyLogoUrl={opp.companyLogoUrl}
                                    applyLink={opp.applyLink}
                                    isGovernment={Boolean(opp.governmentJobDetails)}
                                    className="w-10 h-10 rounded-xl object-contain shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <span className="text-xs font-semibold text-muted-foreground block truncate">{opp.company}</span>
                                    <h2 className="text-sm font-bold text-foreground mt-0.5 leading-snug line-clamp-2">{opp.title}</h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {opp.applyLink && (
                                    <a
                                        href={opp.applyLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center gap-1.5 font-bold transition-colors"
                                    >
                                        Apply link
                                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                    </a>
                                )}
                                <Link
                                    href={getOpportunityPathFromItem(opp)}
                                    target="_blank"
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    title="Open public page"
                                >
                                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                </Link>
                                <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Close">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-5">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md bg-muted/80 text-foreground border border-border/70">
                                    {opp.type === 'INTERNSHIP' ? 'Internship' : opp.type === 'WALKIN' ? 'Walk-in' : opp.type === 'GOVERNMENT' ? 'Govt Job' : 'Job'}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md border ${
                                    opp.status === 'PUBLISHED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                    opp.status === 'DRAFT' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    opp.status === 'DELETED' ? 'bg-red-50 border-red-200 text-red-700' :
                                    'bg-stone-50 border-stone-200 text-stone-600'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                        opp.status === 'PUBLISHED' ? 'bg-emerald-500' : 
                                        opp.status === 'DRAFT' ? 'bg-amber-500' : 
                                        opp.status === 'DELETED' ? 'bg-red-500' :
                                        'bg-stone-400'
                                    }`} />
                                    {opp.status}
                                </span>
                                {getGroupedLocations(opp.locations).length > 0 && (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span className="text-xs font-medium">{getGroupedLocations(opp.locations).join(' • ')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Meta grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5">
                                    <BriefcaseIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground tracking-wide">Experience</p>
                                        <p className="text-xs font-semibold text-foreground mt-1">
                                            {opp.experienceMax ? `${opp.experienceMin || 0}–${opp.experienceMax}y` : 'Fresher'}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5">
                                    <CurrencyRupeeIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground tracking-wide">Salary / Stipend</p>
                                        <p className="text-xs font-semibold text-foreground mt-1 truncate">{opp.stipend || getOpportunityDisplaySalary(opp) || 'Competitive'}</p>
                                    </div>
                                </div>
                                {opp.postedAt && (
                                    <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5">
                                        <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide">Posted</p>
                                            <p className="text-xs font-semibold text-foreground mt-1">{new Date(opp.postedAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                                {opp.expiresAt && (
                                    <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5">
                                        <CalendarIcon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide">Expires</p>
                                            <p className="text-xs font-semibold text-foreground mt-1">{new Date(opp.expiresAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Metadata Badges */}
                            {(opp.workMode || opp.employmentType || opp.jobFunction || (opp.tags && opp.tags.length > 0)) && (
                                <div className="flex flex-wrap gap-2">
                                    {opp.workMode && <span className="px-2 py-1 bg-accent/10 border border-accent/20 rounded-md text-[10px] font-semibold text-accent-foreground uppercase">{opp.workMode}</span>}
                                    {opp.employmentType && <span className="px-2 py-1 bg-accent/10 border border-accent/20 rounded-md text-[10px] font-semibold text-accent-foreground uppercase">{opp.employmentType}</span>}
                                    {opp.jobFunction && <span className="px-2 py-1 bg-accent/10 border border-accent/20 rounded-md text-[10px] font-semibold text-accent-foreground uppercase">{opp.jobFunction}</span>}
                                    {opp.tags?.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-muted border border-border rounded-md text-[10px] font-medium text-muted-foreground">#{tag}</span>
                                    ))}
                                </div>
                            )}

                            {/* Description */}
                            {opp.description && (
                                <DescriptionSection description={opp.description} title="Description" />
                            )}

                            {/* Long Text Fields */}
                            {opp.selectionProcess && (
                                <div className="space-y-3 py-2">
                                    <h3 className="text-base font-bold text-foreground tracking-tight">Selection Process</h3>
                                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{opp.selectionProcess}</p>
                                </div>
                            )}
                            
                            {opp.notesHighlights && (
                                <div className="space-y-3 py-2">
                                    <h3 className="text-base font-bold text-foreground tracking-tight">Notes & Highlights</h3>
                                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{opp.notesHighlights}</p>
                                </div>
                            )}

                            {opp.incentives && (
                                <div className="space-y-3 py-2">
                                    <h3 className="text-base font-bold text-foreground tracking-tight">Incentives</h3>
                                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{opp.incentives}</p>
                                </div>
                            )}

                            {/* Eligibility Grid */}
                            {(opp.allowedDegrees?.length > 0 || opp.allowedPassoutYears?.length > 0 || opp.requiredSkills?.length > 0) && (
                                <div className="space-y-3 py-2 border-t border-border/40 mt-2 pt-4">
                                    <h3 className="text-sm font-bold text-foreground">Requirements & Eligibility</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {opp.allowedDegrees && opp.allowedDegrees.length > 0 && (
                                            <div className="bg-muted/10 border border-border/40 rounded-xl p-3">
                                                <p className="text-[10px] font-bold text-muted-foreground tracking-wide">Degrees</p>
                                                <p className="text-xs font-semibold text-foreground mt-1 truncate">{opp.allowedDegrees.join(', ')}</p>
                                            </div>
                                        )}
                                        {opp.allowedPassoutYears && opp.allowedPassoutYears.length > 0 && (
                                            <div className="bg-muted/10 border border-border/40 rounded-xl p-3">
                                                <p className="text-[10px] font-bold text-muted-foreground tracking-wide">Batch</p>
                                                <p className="text-xs font-semibold text-foreground mt-1 truncate">
                                                    {[...opp.allowedPassoutYears].sort().join(', ')}
                                                </p>
                                            </div>
                                        )}
                                        {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                                            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 col-span-2">
                                                <p className="text-[10px] font-bold text-muted-foreground tracking-wide">Skills</p>
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {opp.requiredSkills.map(s => (
                                                        <span key={s} className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Walk-in details */}
                            {opp.type === 'WALKIN' && opp.walkInDetails && (
                                <div className="border-t border-border/40 pt-4 mt-2">
                                    <WalkInDetailsCard walkInDetails={opp.walkInDetails} />
                                </div>
                            )}

                            {/* Government Job Clean Grid */}
                            {opp.type === 'GOVERNMENT' && opp.governmentJobDetails && (
                                <div className="space-y-3 py-2 border-t border-border/40 mt-2 pt-4">
                                    <h3 className="text-sm font-bold text-foreground">Government Job Metadata</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(opp.governmentJobDetails)
                                            .filter(([k, v]) => v !== null && v !== '' && !['id', 'opportunityId', 'createdAt', 'updatedAt'].includes(k))
                                            .map(([key, value]) => (
                                                <div key={key} className="bg-muted/10 border border-border/40 rounded-xl p-3 flex flex-col justify-center">
                                                    <p className="text-[10px] font-bold text-muted-foreground tracking-wide uppercase truncate">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                    <p className="text-xs font-semibold text-foreground mt-1 truncate">
                                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                    </p>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Application Details Clean Grid */}
                            {opp.applicationDetails && Object.keys(opp.applicationDetails).length > 0 && (
                                <div className="space-y-3 py-2 border-t border-border/40 mt-2 pt-4">
                                    <h3 className="text-sm font-bold text-foreground">Application Metadata</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(opp.applicationDetails).map(([key, value]) => (
                                            <div key={key} className="bg-muted/10 border border-border/40 rounded-xl p-3 flex flex-col justify-center">
                                                <p className="text-[10px] font-bold text-muted-foreground tracking-wide uppercase truncate">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                <p className="text-xs font-semibold text-foreground mt-1 truncate">
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};
