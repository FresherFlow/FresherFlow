'use client';

import { useState } from 'react';
import type { Opportunity } from '@fresherflow/types';
import { ClipboardDocumentListIcon, CodeBracketIcon, ClockIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

type ComplexityCardProps = {
    applicationDetails: NonNullable<Opportunity['applicationDetails']>;
};

export function ComplexityCard({ applicationDetails }: ComplexityCardProps) {
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

    const { method, platform, estimatedMinutes, requiredItems } = applicationDetails;

    // Only render if method is FORM or ASSESSMENT
    if (method !== 'FORM' && method !== 'ASSESSMENT') {
        return null;
    }

    const toggleItem = (idx: number) => {
        setCheckedItems((prev) => ({
            ...prev,
            [idx]: !prev[idx],
        }));
    };

    const isAssessment = method === 'ASSESSMENT';

    return (
        <div className="bg-card border border-border p-5 md:p-6 rounded-xl space-y-5 shadow-sm transition-all duration-300">
            {/* Header and Metadata (Left-aligned) */}
            <div className="flex items-start gap-4">
                {isAssessment ? (
                    <div className="p-3 bg-muted text-muted-foreground rounded-xl shrink-0 shadow-sm border border-border/30">
                        <CodeBracketIcon className="w-6 h-6" />
                    </div>
                ) : (
                    <div className="p-3 bg-muted text-muted-foreground rounded-xl shrink-0 shadow-sm border border-border/30">
                        <ClipboardDocumentListIcon className="w-6 h-6" />
                    </div>
                )}
                
                <div className="space-y-2">
                    <h3 className="text-base md:text-lg font-bold text-foreground">
                        {isAssessment ? '💻 Online Assessment' : '📝 Form Application'}
                    </h3>
                    
                    {/* Horizontal Scannable Metadata Bar */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground">
                        {platform && (
                            <div className="flex items-center gap-1.5 text-foreground">
                                <ComputerDesktopIcon className="w-4 h-4 text-muted-foreground" />
                                <span>Platform: <span className="font-bold">{platform}</span></span>
                            </div>
                        )}
                        {platform && estimatedMinutes && <span className="text-border/60">•</span>}
                        {estimatedMinutes && (
                            <div className="flex items-center gap-1.5 text-foreground">
                                <ClockIcon className="w-4 h-4 text-muted-foreground" />
                                <span>Duration: <span className="font-bold">~{estimatedMinutes} mins</span></span>
                            </div>
                        )}
                        <span className="text-border/60">•</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border/30 shrink-0">
                            {isAssessment ? 'Assessment' : 'Form Details'}
                        </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {isAssessment 
                            ? 'This opportunity includes a timed test, coding assessment, or exam.'
                            : 'This opportunity requires filling out an external portal or form.'
                        }
                    </p>
                </div>
            </div>

            {/* Checklist / Syllabus items */}
            {requiredItems && requiredItems.length > 0 && (
                <div className="space-y-3.5 pt-5 border-t border-border/50">
                    <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
                        {isAssessment ? '💡 Assessment Syllabus / Topics' : '📋 Prepare Before Applying'}
                    </h4>
                    
                    <div className="flex flex-wrap gap-2 pt-1">
                        {requiredItems.map((item, idx) => {
                            if (isAssessment) {
                                return (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/60 text-foreground border border-border/50 hover:bg-muted transition-all duration-200"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mr-2 shrink-0" />
                                        {item}
                                    </span>
                                );
                            }

                            const isChecked = !!checkedItems[idx];
                            return (
                                <label
                                    key={idx}
                                    className={`flex items-center gap-2.5 cursor-pointer select-none px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                                        isChecked 
                                            ? 'bg-muted/40 text-muted-foreground/60 border-transparent line-through' 
                                            : 'bg-card text-foreground hover:bg-muted hover:border-border/80 border-border/50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleItem(idx)}
                                        className="w-3.5 h-3.5 rounded border-input text-foreground focus:ring-0 cursor-pointer shrink-0 accent-foreground"
                                    />
                                    <span>{item}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

