'use client';

import { ActionType, type Opportunity, type User, type GovernmentExamStage } from '@fresherflow/types';
import { cn } from '@/lib/utils/utils';
import { Button } from '@/ui/Button';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import ClipboardDocumentCheckIcon from '@heroicons/react/24/outline/ClipboardDocumentCheckIcon';
import DocumentTextIcon from '@heroicons/react/24/outline/DocumentTextIcon';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import DocumentDuplicateIcon from '@heroicons/react/24/outline/DocumentDuplicateIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import CompanyLogo from '@/ui/CompanyLogo';

import React from 'react';

// Import reusable UI components directly from files to avoid client-side package issues
import { Timeline } from '@repo/ui/components/Timeline';
import { DataTable } from '@repo/ui/components/DataTable';
import { Tabs } from '@repo/ui/components/Tabs';

interface GovernmentJobDetailViewProps {
    opp: Opportunity;
    user: User | null;
    currentAction: ActionType | null;
    trackerOptions: { key: ActionType; label: string }[];
    isUpdatingAction: boolean;
    handleSetAction: (actionType: ActionType) => void;
    hasApplyLink: boolean;
    handleApply: () => void;
    handleToggleSave: () => void;
    handleShare: () => void;
    handleCopyLink: () => void;
    listingState: string;
    formatDeadline: (opp: Opportunity) => string | null;
}



// Collapsible FAQ accordion
const FaqAccordion = ({ faqs }: { faqs: Array<{ question?: string; q?: string; answer?: string; a?: string }> }) => {
    const [openIdx, setOpenIdx] = React.useState<number | null>(null);
    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                <h3 className="text-base font-semibold text-foreground">Frequently Asked Questions</h3>
            </div>
            <div className="divide-y divide-border/40">
                {faqs.map((faq, idx) => {
                    const q = faq.question || faq.q || '';
                    const a = faq.answer || faq.a || '';
                    const isOpen = openIdx === idx;
                    return (
                        <div key={idx}>
                            <button
                                onClick={() => setOpenIdx(isOpen ? null : idx)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors gap-4"
                            >
                                <span className="text-sm font-semibold text-foreground leading-snug">{q}</span>
                                <span className="text-muted-foreground text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
                            </button>
                            {isOpen && (
                                <div className="px-5 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed bg-muted/10">
                                    {a}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Syllabus topics cell
const SyllabusCell = ({ topics }: { topics: string[] }) => {
    if (!topics || topics.length === 0) return <span>-</span>;
    
    // Check if the topics contain colons (indicating long subject-level paragraph blocks like RRB ALP)
    const hasColons = topics.some(t => String(t).includes(':') && String(t).indexOf(':') < 30);
    
    if (!hasColons) {
        // Render all topics inline, joined by commas
        const text = topics.join(', ');
        return (
            <div className="text-sm text-muted-foreground leading-relaxed min-w-[280px] sm:min-w-[320px] md:min-w-[400px] max-w-xl py-1">
                {text}
            </div>
        );
    }
    
    // Otherwise, render all topics as clean paragraph blocks
    return (
        <div className="space-y-2 py-1 min-w-[280px] sm:min-w-[320px] md:min-w-[400px] max-w-xl">
            {topics.map((topic, idx) => {
                const colonIdx = topic.indexOf(':');
                if (colonIdx > 0 && colonIdx < 35) {
                    const prefix = topic.substring(0, colonIdx + 1);
                    const rest = topic.substring(colonIdx + 1);
                    return (
                        <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground mr-1">{prefix}</span>
                            {rest}
                        </p>
                    );
                }
                return (
                    <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                        {topic}
                    </p>
                );
            })}
        </div>
    );
};

// Interactive Vacancy Table component with search, sort, and frozen sticky headers
// Generic vacancy table — handles both { columns, rows } and legacy array-of-objects shapes
const VacancyTable = ({ data }: { data: { columns: string[]; rows: (string | number)[][]; notes?: string } }) => {
    const [search, setSearch] = React.useState('');
    const [sortColIdx, setSortColIdx] = React.useState<number | null>(null);
    const [sortAsc, setSortAsc] = React.useState(true);

    const { columns, rows, notes } = data;

    const handleSort = (idx: number) => {
        if (sortColIdx === idx) setSortAsc(!sortAsc);
        else { setSortColIdx(idx); setSortAsc(true); }
    };

    // Detect if a column contains numeric data (at least one number across all rows)
    const isNumericColumn = React.useMemo(() => {
        return columns.map((_, colIdx) => {
            if (colIdx === 0) return false;
            return rows.some(row => typeof row[colIdx] === 'number');
        });
    }, [columns, rows]);

    // Strict formatting: replace empty, null, undefined, or malformed strings with hyphen
    const formatCellValue = (val: any) => {
        if (val === null || val === undefined) return '-';
        const strVal = String(val).trim();
        if (strVal === '' || strVal === '-') return '-';
        return val;
    };

    const filteredRows = React.useMemo(() => {
        let result = [...rows];
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(row =>
                row.some(cell => String(cell ?? '').toLowerCase().includes(q))
            );
        }
        if (sortColIdx !== null) {
            result.sort((a, b) => {
                const valA = a[sortColIdx] ?? '';
                const valB = b[sortColIdx] ?? '';
                const numA = Number(valA);
                const numB = Number(valB);
                if (!isNaN(numA) && !isNaN(numB)) return sortAsc ? numA - numB : numB - numA;
                return sortAsc
                    ? String(valA).localeCompare(String(valB))
                    : String(valB).localeCompare(String(valA));
            });
        }
        return result;
    }, [rows, search, sortColIdx, sortAsc]);

    return (
        <div className="space-y-3">
            {rows.length > 8 && (
                <div className="relative max-w-sm">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-9 pl-3 pr-8 text-sm bg-muted border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} aria-label="Clear Search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm font-bold">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            )}
            <div className="border border-border rounded-lg overflow-x-auto overflow-y-auto max-h-[500px] w-full scrollbar-thin">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                        <tr>
                            {columns.map((col, idx) => {
                                const isSorted = sortColIdx === idx;
                                return (
                                    <th
                                        key={idx}
                                        onClick={() => handleSort(idx)}
                                        className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted-foreground/10 transition-colors select-none whitespace-nowrap text-left"
                                    >
                                        <div className="flex items-center gap-1 justify-start">
                                            {col}
                                            <span className="opacity-60">{isSorted ? (sortAsc ? '▲' : '▼') : '↕'}</span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 bg-card">
                        {filteredRows.length > 0 ? (
                            filteredRows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                                    {row.map((cell, cIdx) => {
                                        const isNumeric = isNumericColumn[cIdx];
                                        const formattedVal = formatCellValue(cell);
                                        return (
                                            <td
                                                key={cIdx}
                                                className={cn(
                                                    "p-3 leading-normal text-left text-sm",
                                                    cIdx === 0
                                                        ? "font-medium text-foreground"
                                                        : isNumeric
                                                            ? "font-medium text-foreground/80 tabular-nums"
                                                            : "text-muted-foreground"
                                                )}
                                            >
                                                {formattedVal}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                                    No results matching &ldquo;{search}&rdquo;
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {notes && <p className="text-sm text-muted-foreground leading-relaxed">{notes}</p>}
        </div>
    );
};

// Collapsible Exam Centers widget with search capabilities
const ExamCentersWidget = ({ centers }: { centers: string[] }) => {
    const [search, setSearch] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(false);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return centers;
        const q = search.toLowerCase();
        return centers.filter(c => c.toLowerCase().includes(q));
    }, [centers, search]);

    return (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between pb-1 focus:outline-none"
            >
                <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Exam Centers</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {centers.length} Cities
                    </span>
                    <span className="text-muted-foreground text-xs font-bold">{isOpen ? '▲' : '▼'}</span>
                </div>
            </button>

            {isOpen && (
                <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search city..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-8 pl-3 pr-8 text-xs bg-muted border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground font-semibold"
                        />
                        {search && (
                            <button 
                                onClick={() => setSearch('')}
                                aria-label="Clear Search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="max-h-60 overflow-y-auto pr-1 text-xs">
                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {filtered.map((center: string, idx: number) => (
                                    <div key={idx} className="bg-muted/10 border border-border/30 p-2 rounded text-center truncate font-semibold text-foreground/80 hover:bg-muted/20 hover:border-border transition-colors">
                                        {center}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground py-2 font-semibold">No centers found matching &quot;{search}&quot;</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export function GovernmentJobDetailView({
    opp,
    user,
    currentAction,
    trackerOptions,
    isUpdatingAction,
    handleSetAction,
    hasApplyLink,
    handleApply,
    handleShare,
    handleCopyLink,
    listingState,
}: GovernmentJobDetailViewProps) {
    const details = opp.governmentJobDetails || {} as any;
    const hasSalaryInfo = Boolean(details.basicPay || details.payLevel || (details.allowances && details.allowances.length > 0) || details.extraMetadata?.promotionPath || details.extraMetadata?.careerGrowth || details.extraMetadata?.promotionOpportunities);

    // Helper to clean leading asterisk from text
    const cleanAsteriskPrefix = (text: string) => {
        if (!text) return '';
        const trimmed = text.trim();
        return trimmed.startsWith('*') ? trimmed.slice(1).trim() : trimmed;
    };

    // Helper to format date safely
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'TBA';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    // Helper to extract a date from importantDates by keyword
    const findDateByKeyword = (keywords: string[]) => {
        if (!details.importantDates || !Array.isArray(details.importantDates)) return null;
        const match = details.importantDates.find((item: any) => {
            const label = (item.label || item.title || '').toLowerCase();
            return keywords.some(keyword => label.includes(keyword));
        });
        return match && match.date ? formatDate(match.date) : null;
    };

    const parsedStartDate = details.applicationStartDate
        ? formatDate(details.applicationStartDate)
        : (findDateByKeyword(['starts', 'open', 'registration start', 'apply start']) || 'To Be Announced');

    const parsedEndDate = details.applicationEndDate
        ? formatDate(details.applicationEndDate)
        : (findDateByKeyword(['ends', 'last date', 'closes', 'registration end', 'apply end']) || 'To Be Announced');

    const parsedExamDate = details.examDate
        ? formatDate(details.examDate)
        : (details.examDates?.prelims
            ? formatDate(details.examDates.prelims)
            : (findDateByKeyword(['exam', 'tier 1', 'tier i', 'examination']) || 'To Be Announced'));

    const parsedNotificationIssuedDate = (details.notificationIssuedDate && details.notificationIssuedDate.trim() !== '')
        ? formatDate(details.notificationIssuedDate)
        : (findDateByKeyword(['released', 'issued', 'advertisement', 'notification date']) || 'Refer to Notice');

    const parsedAdmitCardDate = (details.admitCardDate && details.admitCardDate.trim() !== '')
        ? formatDate(details.admitCardDate)
        : (findDateByKeyword(['admit card', 'hall ticket', 'call letter']) || 'Available Soon');

    const parsedResultDate = (details.resultDate && details.resultDate.trim() !== '')
        ? formatDate(details.resultDate)
        : (findDateByKeyword(['result', 'declaration']) || 'To Be Announced');

    // Dynamic extraction of metadata keys
    const changesKey = Object.keys(details.extraMetadata || {}).find(key => key.startsWith('changesIn'));
    const keyChangesList = changesKey ? (details.extraMetadata[changesKey] as string[]) : null;
    const keyChangesYear = changesKey ? changesKey.replace('changesIn', '') : '';

    // vacancyTrend: support both array [{year,vacancies}] and legacy object {year: count}
    const vacancyTrends = React.useMemo(() => {
        const raw = details.extraMetadata?.vacancyTrend;
        if (!raw) return null;
        if (Array.isArray(raw)) {
            // Convert [{year, vacancies}] → { year: count }
            const obj: Record<string, number> = {};
            raw.forEach((e: any) => { if (e.year) obj[String(e.year)] = Number(e.vacancies ?? e.count ?? 0); });
            return obj;
        }
        return raw as Record<string, number>;
    }, [details.extraMetadata?.vacancyTrend]);

    // rules: support both array of strings and legacy keyed object
    const examRules = React.useMemo(() => {
        const raw = details.extraMetadata?.rules;
        if (!raw) return null;
        if (Array.isArray(raw) && raw.length > 0) {
            // Render as numbered list; convert to object for existing renderer
            const obj: Record<string, string> = {};
            raw.forEach((r: string, i: number) => { obj[`step${i + 1}`] = r; });
            return obj;
        }
        if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, string>;
        return null;
    }, [details.extraMetadata?.rules]);

    const examRegions = details.extraMetadata?.examCenterRegions || details.extraMetadata?.regions || null;
    const cutOffData = Array.isArray(details.cutOffMarks) && details.cutOffMarks.length > 0 ? details.cutOffMarks : null;
    const postWiseSalary = Array.isArray(details.extraMetadata?.postWiseSalary) && details.extraMetadata.postWiseSalary.length > 0
        ? details.extraMetadata.postWiseSalary : null;
    const helplineNumber = details.extraMetadata?.helpline || null;

    // Helper to format fee values safely
    const formatFee = (value: number | string | undefined | null) => {
        if (value === undefined || value === null) return 'N/A';
        return value === 0 || value === '0' || String(value).toLowerCase() === 'nil' ? 'Free' : `₹${value}`;
    };

    // Category-wise fee details (supporting both feeBreakdown and applicationFeeDetails)
    const feeDetails = details.feeBreakdown || details.applicationFeeDetails;
    const isStructuredFee = !!(feeDetails && typeof feeDetails === 'object' && 'rows' in feeDetails && Array.isArray((feeDetails as any).rows));
    const hasFees = feeDetails && (
        isStructuredFee 
            ? ((feeDetails as any).rows.length > 0)
            : (Object.keys(feeDetails).length > 0)
    );

    // Group categories with identical formatted fee amounts
    const groupedFees = React.useMemo(() => {
        if (!feeDetails || isStructuredFee) return [];
        const groups: { [amount: string]: string[] } = {};
        Object.entries(feeDetails).forEach(([category, amount]) => {
            if (amount && typeof amount === 'object') return;
            const formatted = formatFee(amount as any);
            if (!groups[formatted]) {
                groups[formatted] = [];
            }
            groups[formatted].push(category);
        });
        return Object.entries(groups);
    }, [feeDetails, isStructuredFee]);

    const education = details.eligibilityDetails?.education || [];
    const ageLabel = details.eligibilityDetails?.age
        ? `${details.eligibilityDetails.age.min ?? details.ageMin ?? '?'} - ${details.eligibilityDetails.age.max ?? details.ageMax ?? '?'} Years`
        : details.ageMin != null || details.ageMax != null
            ? `${details.ageMin ?? '?'} - ${details.ageMax ?? '?'} Years`
            : null;

    // Safe parsing for array data types in Json fields
    // Normalize vacancyBreakdown to the generic { columns, rows } contract.
    // Handles both the new shape and legacy array-of-objects.
    const vacancyTableData = React.useMemo(() => {
        const raw = details.vacancyBreakdown as any;
        if (!raw) return null;
        // New shape: { columns: string[], rows: any[][], notes?: string }
        if (raw && !Array.isArray(raw) && Array.isArray(raw.columns) && Array.isArray(raw.rows)) {
            return raw as { columns: string[]; rows: (string | number)[][]; notes?: string };
        }
        // Legacy shape: array of objects — auto-derive columns from first item's keys
        if (Array.isArray(raw) && raw.length > 0) {
            const keys = Object.keys(raw[0]);
            const columns = keys.map((k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim());
            const rows = raw.map((item: any) => keys.map((k) => item[k] ?? '-'));
            return { columns, rows };
        }
        return null;
    }, [details.vacancyBreakdown]);

    const isHeavyTable = React.useMemo(() => {
        if (!vacancyTableData) return false;
        const colMaxLens = vacancyTableData.columns.map((col, colIdx) => {
            const rowLens = vacancyTableData.rows.map(row => {
                const cellVal = row[colIdx];
                return cellVal != null ? String(cellVal).length : 0;
            });
            return Math.max(col.length, ...rowLens);
        });
        const totalWidth = colMaxLens.reduce((sum, len) => sum + len, 0);
        return totalWidth > 65;
    }, [vacancyTableData]);

    const examStagesList = Array.isArray(details.examStages)
        ? (details.examStages as unknown as GovernmentExamStage[])
        : [];

    // Mapping important dates timeline
    const timelineEvents = (Array.isArray(details.importantDates) ? details.importantDates : []).map((d: any) => ({
        label: d.label || d.title || 'Event',
        date: d.date ? formatDate(d.date) : 'TBA',
        description: d.description || d.notes || '',
    }));

    // Mapping age relaxation rules
    const hasAnyRelaxationNotes = (Array.isArray(details.ageRelaxationRules) ? details.ageRelaxationRules : []).some(
        (r: any) => r.notes && r.notes.trim() !== '' && r.notes.trim() !== '-'
    );

    const relaxationHeaders = hasAnyRelaxationNotes
        ? ['Category', 'Age Relaxation', 'Notes']
        : ['Category', 'Age Relaxation'];

    const relaxationRows = (Array.isArray(details.ageRelaxationRules) ? details.ageRelaxationRules : []).map((r: any) => {
        const category = r.category || '-';
        const relaxation = r.relaxationYears ? `+ ${r.relaxationYears} Years` : (r.relaxation || '-');
        const notes = r.notes || '-';
        const row = [
            <span className="font-medium text-foreground text-sm" key="cat">{category}</span>,
            <span className="text-muted-foreground text-sm" key="years">{relaxation}</span>,
        ];
        if (hasAnyRelaxationNotes) {
            row.push(<span className="text-muted-foreground text-sm" key="notes">{notes}</span>);
        }
        return row;
    });

    // Mapping exam pattern syllabus tabs
    const syllabusTabs = (Array.isArray(details.examPattern?.tiers) ? details.examPattern.tiers : []).map((tier: any, index: number) => {
        const subjectsHeaders = ['Subject', 'Questions', 'Marks', 'Duration', 'Syllabus'];
        const subjectsRows = (Array.isArray(tier.subjects) ? tier.subjects : []).map((s: any) => [
            <div className="font-medium text-foreground text-sm min-w-[150px] md:min-w-[200px]" key="name">{s.name}</div>,
            <span className="text-muted-foreground text-sm whitespace-nowrap" key="q">{s.questions ?? '-'}</span>,
            <span className="text-muted-foreground text-sm whitespace-nowrap" key="m">{s.marks ?? '-'}</span>,
            <span className="text-muted-foreground text-sm whitespace-nowrap" key="time">{s.sectionTimeMinutes ? `${s.sectionTimeMinutes} Mins` : '-'}</span>,
            <SyllabusCell topics={s.syllabus} key="syll" />,
        ]);

        const tabContent = (
            <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-b border-border/50 pb-4">
                    <div>
                        <span className="text-muted-foreground block uppercase font-semibold tracking-wider text-[10px]">Mode of Exam</span>
                        <span className="font-semibold text-foreground text-sm">{tier.mode || 'Computer Based Test (CBT)'}</span>
                    </div>
                    {tier.durationMinutes && (
                        <div>
                            <span className="text-muted-foreground block uppercase font-semibold tracking-wider text-[10px]">Duration</span>
                            <span className="font-semibold text-foreground text-sm">{tier.durationMinutes} Minutes</span>
                        </div>
                    )}
                    {tier.totalQuestions && (
                        <div>
                            <span className="text-muted-foreground block uppercase font-semibold tracking-wider text-[10px]">Total Questions</span>
                            <span className="font-semibold text-foreground text-sm">{tier.totalQuestions}</span>
                        </div>
                    )}
                    {tier.totalMarks && (
                        <div>
                            <span className="text-muted-foreground block uppercase font-semibold tracking-wider text-[10px]">Total Marks</span>
                            <span className="font-semibold text-foreground text-sm">{tier.totalMarks} Marks</span>
                        </div>
                    )}
                </div>

                {tier.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded border border-border/50">
                        {tier.notes}
                    </p>
                )}

                {tier.subjects && tier.subjects.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wider">Subjects & Topics Syllabus</p>
                        <DataTable headers={subjectsHeaders} data={subjectsRows} />
                    </div>
                )}
            </div>
        );

        return {
            id: `tier-${index}`,
            label: tier.name || `Tier ${index + 1}`,
            content: tabContent,
        };
    });

    const getTightDescription = (desc?: string) => {
        if (!desc) return '';
        const sentences = desc.split(/(?<=\.)\s+/);
        if (sentences.length > 0) {
            return sentences[0] + '.';
        }
        return desc;
    };

    const getStageSubLabel = (stageName: string, qualifying?: boolean) => {
        const name = stageName.toLowerCase();
        if (name.includes('tier 1') || name.includes('tier i') || name.includes('phase 1') || name.includes('phase i')) {
            return 'Objective CBT';
        }
        if (name.includes('tier 2') || name.includes('tier ii') || name.includes('phase 2') || name.includes('phase ii')) {
            return 'Merit Determining Stage';
        }
        if (name.includes('document verification') || name.includes('dv')) {
            return 'Final Eligibility Check';
        }
        return qualifying ? 'Qualifying Stage' : 'Merit Determining Stage';
    };

    const parseInstructions = (text?: string) => {
        if (!text) return [];
        return text
            .split(/(?<=\.)\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && s !== '.');
    };

    // Filter documents checklist to avoid empty layouts
    const validRequiredDocuments = React.useMemo(() => {
        return (Array.isArray(details.requiredDocuments) ? details.requiredDocuments : []).filter((doc: string) => doc && doc.trim() !== "");
    }, [details.requiredDocuments]);

    const validRequiredDocumentDetails = React.useMemo(() => {
        return Array.isArray(details.requiredDocumentDetails)
            ? (details.requiredDocumentDetails as any[]).filter((doc: any) => doc && doc.name && doc.name.trim() !== "")
            : [];
    }, [details.requiredDocumentDetails]);

    const instructionBullets = parseInstructions(details.importantInstructions);

    const { documents, instructions } = React.useMemo(() => {
        const title = opp.title.toLowerCase();
        
        // SSC CGL specific overrides
        if (title.includes('ssc') && (title.includes('cgl') || title.includes('combined graduate level'))) {
            return {
                documents: [
                    'Graduation Marksheet (or equivalent degree certificate)',
                    'Valid Photo ID Proof (Aadhaar, PAN, Voter ID, etc.)',
                    'Category Certificate (SC/ST/OBC/EWS, if applicable)',
                    'Scanned Photograph (Recent passport-size, clear background)',
                    'Scanned Signature (Sign in black ink on white paper)',
                    '10th & 12th Class Marksheets (for DOB & board proof)',
                    'PwD Certificate (if claiming disability reservation)'
                ],
                instructions: [
                    'One-Time Registration (OTR) is mandatory on the new SSC website.',
                    'Live photo capture required using a webcam or smartphone camera.',
                    'Verify all details carefully before final submission (No changes allowed after lock).',
                    'Ensure signature file matches the exact 1–12 KB size limit.',
                    'Obtain category certificates before the specified cutoff/closing date.'
                ]
            };
        }

        // Clean fallback
        const cleanDocs = validRequiredDocuments.map((doc: string) => {
            let clean = doc;
            if (clean.toLowerCase().includes('signature (')) {
                clean = 'Scanned Signature';
            } else if (clean.toLowerCase().includes('photograph (')) {
                clean = 'Scanned Photograph';
            } else if (clean.toLowerCase().includes('id proof (')) {
                clean = 'Valid ID Proof';
            }
            return clean;
        });

        const defaultDocs = cleanDocs.length > 0 ? cleanDocs : [
            'Graduation Marksheet',
            'Valid ID Proof',
            'Category Certificate',
            'Photograph',
            'Signature'
        ];

        const defaultInstructions = instructionBullets.length > 0 ? instructionBullets : [
            'OTR (One-Time Registration) mandatory',
            'Capture live photo if required by portal',
            'Verify details before final submit'
        ];

        return {
            documents: defaultDocs,
            instructions: defaultInstructions
        };
    }, [opp.title, validRequiredDocuments, instructionBullets]);

    const applicationStatus = details.applicationStatus as string | undefined;

    // Phase-aware primary CTA
    const renderPhaseCTA = () => {
        const base = 'w-full h-11 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm rounded-lg border transition-colors';

        if (applicationStatus === 'ADMIT_CARD_RELEASED' && details.admitCardUrl) {
            return (
                <a href={details.admitCardUrl} target="_blank" rel="noopener noreferrer" className={`${base} bg-primary hover:bg-primary/90 text-primary-foreground border-transparent`}>
                    🎫 Download Admit Card
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
            );
        }
        if (applicationStatus === 'ANSWER_KEY_RELEASED' && details.answerKeyUrl) {
            return (
                <a href={details.answerKeyUrl} target="_blank" rel="noopener noreferrer" className={`${base} bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700`}>
                    🔑 View Answer Key
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
            );
        }
        if (applicationStatus === 'RESULT_DECLARED' && details.resultUrl) {
            return (
                <a href={details.resultUrl} target="_blank" rel="noopener noreferrer" className={`${base} bg-orange-500 hover:bg-orange-600 text-white border-orange-600`}>
                    🏆 View Result
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
            );
        }
        if (['COUNSELLING', 'DOCUMENT_VERIFICATION'].includes(applicationStatus || '')) {
            return (
                <a href={details.officialWebsiteUrl || opp.applyLink || '#'} target="_blank" rel="noopener noreferrer" className={`${base} bg-secondary hover:bg-secondary/80 text-secondary-foreground border-transparent`}>
                    🗂 Visit Official Portal
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
            );
        }
        if (applicationStatus === 'UPCOMING') {
            return (
                <div className="w-full h-11 rounded-lg border border-blue-400/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider">
                    🕐 Applications Not Started Yet
                </div>
            );
        }
        if (applicationStatus === 'CLOSED' || applicationStatus === 'CANCELLED' || applicationStatus === 'COMPLETED') {
            return (
                <div className="w-full h-11 rounded-lg border border-border bg-muted text-muted-foreground flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider">
                    Application Window Closed
                </div>
            );
        }
        // Default: show apply button if link available
        if (!hasApplyLink) return null;
        if (listingState === 'EXPIRED') {
            return (
                <div className="w-full h-11 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider cursor-not-allowed">
                    <ClockIcon className="w-4 h-4" />
                    Closed
                </div>
            );
        }
        return (
            <Button onClick={handleApply} className="w-full h-11 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm">
                Apply Online
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </Button>
        );
    };



    const renderApplyPortal = () => (
        <div id="important-links" className="bg-card border-2 border-primary/20 rounded-xl overflow-hidden shadow-sm scroll-mt-24">
            <div className="bg-primary/5 border-b-2 border-primary/20 p-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Important Links</h3>
            </div>
            
            <div className="p-3 space-y-3">
                {/* Phase-aware primary CTA */}
                {renderPhaseCTA()}
                
                {/* Important Links List */}
                {(details.officialNotificationUrl || details.officialWebsiteUrl || details.notificationPdfUrl || details.admitCardUrl || details.resultUrl || details.answerKeyUrl || details.syllabusUrl || details.previousPapersUrl) && (
                    <div className="divide-y divide-border/50 border border-border rounded-lg overflow-hidden">
                        {/* Download Notification */}
                        {(details.notificationPdfUrl || details.officialNotificationUrl) && (
                            <div className="flex justify-between items-center p-2.5 gap-2 hover:bg-muted/10 transition-colors bg-card">
                                <span className="font-bold text-foreground text-[11px] sm:text-xs uppercase tracking-wider">Download Notice</span>
                                <a href={details.notificationPdfUrl || details.officialNotificationUrl} target="_blank" rel="noreferrer" className="text-primary font-bold text-[10px] uppercase hover:underline inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-1 rounded">
                                    Click Here <DocumentTextIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}
                        {/* Download Admit Card */}
                        {details.admitCardUrl && (
                            <div className="flex justify-between items-center p-2.5 gap-2 hover:bg-muted/10 transition-colors bg-card">
                                <span className="font-bold text-foreground text-[11px] sm:text-xs uppercase tracking-wider">Admit Card</span>
                                <a href={details.admitCardUrl} target="_blank" rel="noreferrer" className="text-primary font-bold text-[10px] uppercase hover:underline inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-1 rounded">
                                    Click Here <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}
                        {/* Check Exam Result */}
                        {details.resultUrl && (
                            <div className="flex justify-between items-center p-2.5 gap-2 hover:bg-muted/10 transition-colors bg-card">
                                <span className="font-bold text-foreground text-[11px] sm:text-xs uppercase tracking-wider">Exam Result</span>
                                <a href={details.resultUrl} target="_blank" rel="noreferrer" className="text-primary font-bold text-[10px] uppercase hover:underline inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-1 rounded">
                                    Click Here <CheckCircleIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}
                        {/* View Answer Key */}
                        {details.answerKeyUrl && (
                            <div className="flex justify-between items-center p-2.5 gap-2 hover:bg-muted/10 transition-colors bg-card">
                                <span className="font-bold text-foreground text-[11px] sm:text-xs uppercase tracking-wider">Answer Key</span>
                                <a href={details.answerKeyUrl} target="_blank" rel="noreferrer" className="text-primary font-bold text-[10px] uppercase hover:underline inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-1 rounded">
                                    Click Here <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}
                        {/* View Exam Syllabus */}
                        {details.syllabusUrl && (
                            <div className="flex justify-between items-center p-2.5 gap-2 hover:bg-muted/10 transition-colors bg-card">
                                <span className="font-bold text-foreground text-[11px] sm:text-xs uppercase tracking-wider">Exam Syllabus</span>
                                <a href={details.syllabusUrl} target="_blank" rel="noreferrer" className="text-primary font-bold text-[10px] uppercase hover:underline inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-1 rounded">
                                    Click Here <AcademicCapIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}
                        {/* Previous Question Papers */}
                        {details.previousPapersUrl && (
                            <div className="flex justify-between items-center p-2.5 gap-2 hover:bg-muted/10 transition-colors bg-card">
                                <span className="font-bold text-foreground text-[11px] sm:text-xs uppercase tracking-wider">Previous Papers</span>
                                <a href={details.previousPapersUrl} target="_blank" rel="noreferrer" className="text-primary font-bold text-[10px] uppercase hover:underline inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-1 rounded">
                                    Click Here <DocumentTextIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}
                        {/* Official Website */}
                        {details.officialWebsiteUrl && (
                            <div className="flex justify-between items-center p-2.5 gap-2 hover:bg-muted/10 transition-colors bg-card">
                                <span className="font-bold text-foreground text-[11px] sm:text-xs uppercase tracking-wider">Official Website</span>
                                <a href={details.officialWebsiteUrl} target="_blank" rel="noreferrer" className="text-primary font-bold text-[10px] uppercase hover:underline inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-1 rounded">
                                    Click Here <GlobeAltIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Share and Copy Links */}
                <div className="grid grid-cols-2 gap-2 pt-1 mt-4">
                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                        <ShareIcon className="w-3.5 h-3.5" />
                        Share
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Copy Link
                    </button>
                </div>

                {/* Progress Tracking */}
                {user && (
                    <div className="space-y-2 pt-3 border-t border-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Track Application</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {trackerOptions.map((option) => {
                                const isActive = currentAction === option.key;
                                return (
                                    <button
                                        key={option.key}
                                        onClick={() => handleSetAction(option.key)}
                                        disabled={isUpdatingAction}
                                        className={cn(
                                            "h-8 rounded text-[10px] font-bold uppercase tracking-wider transition-colors",
                                            isActive
                                                ? "bg-primary text-primary-foreground border border-primary"
                                                : "bg-muted/30 border border-border/60 text-muted-foreground hover:bg-muted",
                                            isUpdatingAction && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderKeyDates = () => {
        const handleScrollToResources = (e: React.MouseEvent) => {
            e.preventDefault();
            const el = document.getElementById('official-resources');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                setTimeout(() => {
                    el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                }, 2000);
            }
        };

        const datesList = [
            { label: 'Notification Issued', value: parsedNotificationIssuedDate },
            { label: 'Starts', value: parsedStartDate },
            { label: 'Ends', value: parsedEndDate, highlight: parsedEndDate !== 'To Be Announced' && listingState !== 'EXPIRED' },
            { label: 'Admit Card', value: parsedAdmitCardDate },
            { label: 'Exam Date', value: parsedExamDate },
            { label: 'Result Date', value: parsedResultDate }
        ].map(date => {
            const isClickable = date.value === 'Refer to Notice' || date.value === 'Check circular';
            return {
                ...date,
                onClick: isClickable ? handleScrollToResources : undefined
            };
        });

        return (
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Key Dates</h3>
                </div>
                <div className="space-y-2 text-sm">
                    {datesList.map((date, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
                            <span className="font-semibold text-muted-foreground">{date.label}</span>
                            <span className={cn(
                                "font-semibold text-foreground text-right",
                                date.highlight && "text-destructive"
                            )}>
                                {date.onClick ? (
                                    <button
                                        onClick={date.onClick}
                                        className="text-primary hover:underline font-semibold focus:outline-none text-right"
                                    >
                                        {date.value}
                                    </button>
                                ) : (
                                    date.value
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderApplicationFee = () => (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <CurrencyRupeeIcon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Application Fee</h3>
            </div>
            {hasFees ? (
                <div className="space-y-2 text-sm">
                    {isStructuredFee ? (
                        <>
                            {((feeDetails as any).rows as Array<{ category: string; amount: string | number }>).map((row, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-muted/10 border border-border/50 p-2.5 rounded-lg text-sm leading-snug">
                                    <span className="text-xs font-semibold text-muted-foreground leading-normal pr-4">{row.category}</span>
                                    <span className="font-bold text-foreground shrink-0">
                                        {typeof row.amount === 'string' && row.amount.startsWith('₹') ? row.amount : formatFee(row.amount)}
                                    </span>
                                </div>
                            ))}
                            {/* Notes / Payment modes */}
                            {((feeDetails as any).notes || ((feeDetails as any).paymentModes && (feeDetails as any).paymentModes.length > 0)) && (
                                <div className="pt-2.5 border-t border-border/50 space-y-2 text-xs text-muted-foreground font-medium">
                                    {(feeDetails as any).notes && (
                                        <div>
                                            <p className="font-semibold text-foreground/80 uppercase text-[9px] tracking-wider mb-0.5">Notes</p>
                                            <p className="text-foreground/70">{cleanAsteriskPrefix((feeDetails as any).notes)}</p>
                                        </div>
                                    )}
                                    {(feeDetails as any).paymentModes && (feeDetails as any).paymentModes.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-foreground/80 uppercase text-[9px] tracking-wider mb-0.5">Payment Modes</p>
                                            <p className="text-foreground/70">{cleanAsteriskPrefix((feeDetails as any).paymentModes.join(', '))}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        groupedFees.map(([amount, categories]) => (
                            <div key={amount} className="flex justify-between items-center bg-muted/10 border border-border/50 p-2.5 rounded-lg text-sm leading-snug">
                                <span className="text-xs font-semibold text-muted-foreground leading-normal pr-4">{categories.join(', ')}</span>
                                <span className="font-bold text-foreground shrink-0">
                                    {amount}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="flex justify-between items-center bg-muted/10 border border-border/50 p-2.5 rounded-lg text-sm leading-snug">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">General Fee</span>
                    <span className="font-bold text-foreground shrink-0">
                        {details.applicationFee || 'Refer to Circular'}
                    </span>
                </div>
            )}
            <p className="text-xs text-muted-foreground leading-normal">
                * Payment must be processed through official digital methods as specified in the recruitment announcement.
            </p>
        </div>
    );

    const renderAgeCriteria = () => (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <ClockIcon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Age Criteria</h3>
            </div>
            <div className="space-y-4 text-sm">
                <div>
                    <span className="text-xs font-medium text-muted-foreground block">Age limit</span>
                    <p className="text-base font-bold text-foreground">{ageLabel || 'As per notice'}</p>
                </div>
                {details.eligibilityDetails?.age?.notes && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {details.eligibilityDetails.age.notes}
                    </p>
                )}
                {details.ageRelaxation && (
                    <div className="bg-primary/5 border border-primary/10 px-2 py-1 rounded text-xs font-semibold text-primary inline-block">
                        Age Relaxation: {details.ageRelaxation}
                    </div>
                )}

                {relaxationRows.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category Age Relaxations</p>
                        <DataTable headers={relaxationHeaders} data={relaxationRows} />
                    </div>
                )}
            </div>
        </div>
    );

    const renderSelectionProcess = (isLeft: boolean) => {
        const showSelection = (details.selectionStages && Array.isArray(details.selectionStages) && details.selectionStages.length > 0) ||
                              (details.skillTests && Array.isArray(details.skillTests) && details.skillTests.length > 0);
        if (!showSelection) return null;

        return (
            <div className={cn(
                "bg-card border border-border rounded-xl p-4 shadow-sm space-y-3",
                isLeft ? "" : "hidden lg:block"
            )}>
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className={cn("font-semibold text-foreground", isLeft ? "text-base" : "text-sm")}>
                        Selection Process
                    </h3>
                </div>
                
                {details.selectionStages && Array.isArray(details.selectionStages) && details.selectionStages.length > 0 && (
                    <div className={cn(
                        "grid gap-3",
                        isLeft ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1"
                    )}>
                        {details.selectionStages.map((stage: any, index: number) => {
                            const stageName = typeof stage === 'string' ? stage : stage.name;
                            const stageQualifying = typeof stage === 'string' ? undefined : stage.qualifying;
                            const stageDesc = typeof stage === 'string' ? undefined : (stage.description || stage.notes);
                            const infoLabel = getStageSubLabel(stageName, stageQualifying);

                            return (
                                <div key={stageName} className="flex flex-col gap-1.5 justify-center bg-muted/5 border border-border/50 p-4 rounded-xl hover:border-primary/20 transition-colors">
                                    <div className="flex items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary shrink-0">
                                                {index + 1}
                                            </div>
                                            <span className="text-sm font-semibold text-foreground leading-snug">{stageName}</span>
                                        </div>
                                        {infoLabel && (
                                            <InformationCircleIcon 
                                                className="w-4 h-4 text-muted-foreground/80 hover:text-foreground cursor-help transition-colors shrink-0"
                                                title={infoLabel}
                                            />
                                        )}
                                    </div>
                                    {stageDesc && (
                                        <p className="text-xs text-muted-foreground pl-7 leading-normal mt-0.5">
                                            {stageDesc}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {details.skillTests && Array.isArray(details.skillTests) && details.skillTests.length > 0 && (
                    <div className="pt-4 border-t border-border/50">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2.5">Required Skill / Typing Tests</p>
                        <div className={cn(
                            "grid gap-3",
                            isLeft ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1"
                        )}>
                            {details.skillTests.map((test: any, idx: number) => (
                                <div key={idx} className="bg-muted/10 border border-border/40 p-3 rounded-lg flex flex-col justify-between">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-semibold text-foreground text-sm">{test.name}</p>
                                        <span className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded border leading-none shrink-0",
                                            test.mandatory
                                                ? "bg-destructive/5 text-destructive border-destructive/20"
                                                : "bg-muted text-muted-foreground border-border"
                                        )}>
                                            {test.mandatory ? 'Mandatory' : 'Optional'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground font-semibold">
                                        {test.qualifying && (
                                            <span className="text-emerald-600 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">Qualifying only</span>
                                        )}
                                        {test.durationMinutes && (
                                            <span>Duration: {test.durationMinutes} Mins</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderPhysicalStandards = (isLeft: boolean) => {
        const showPhysical = details.physicalStandards && (details.physicalStandards.notes || (details.physicalStandards.applicablePosts && Array.isArray(details.physicalStandards.applicablePosts) && details.physicalStandards.applicablePosts.length > 0));
        if (!showPhysical) return null;

        return (
            <div className={cn(
                "bg-card border border-border rounded-xl p-4 shadow-sm space-y-3",
                isLeft ? "" : "hidden lg:block"
            )}>
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <ShieldCheckIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className={cn("font-semibold text-foreground", isLeft ? "text-base" : "text-sm")}>
                        Physical & Medical Standards
                    </h3>
                </div>
                <div className="space-y-3 text-xs leading-relaxed text-muted-foreground font-medium">
                    {details.physicalStandards.applicablePosts && Array.isArray(details.physicalStandards.applicablePosts) && details.physicalStandards.applicablePosts.length > 0 && (
                        <div>
                            <p className="font-bold text-foreground uppercase text-[10px] tracking-wider mb-1">Applicable Posts</p>
                            <div className="flex flex-wrap gap-1">
                                {details.physicalStandards.applicablePosts.map((post: string, idx: number) => (
                                    <span key={idx} className="bg-muted border border-border px-2 py-0.5 rounded font-medium text-[10px] text-foreground">
                                        {post}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {details.physicalStandards.notes && (
                        <div>
                            <p className="font-bold text-foreground uppercase text-[10px] tracking-wider mb-0.5">Physical / Medical Notes</p>
                            <p className="text-foreground/90 text-sm leading-relaxed">{details.physicalStandards.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!opp.governmentJobDetails) return null;

    return (
        <div className="space-y-4">

            {/* Desktop Two-Column Grid / Mobile Stack */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                
                {/* Left Column (2/3 width) - Primary Content */}
                <div className="lg:col-span-2 space-y-4">
                    
                    {/* Header Summary Card */}
                    <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm space-y-4">
                        <div className="flex flex-col-reverse md:flex-row items-start justify-between gap-4 md:gap-6">
                            <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary border border-primary/20 rounded uppercase tracking-wider flex items-center gap-1">
                                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                                            Govt Job
                                        </span>
                                        
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold border rounded uppercase tracking-wider",
                                            listingState === 'EXPIRED'
                                                ? "bg-destructive/5 text-destructive border-destructive/20"
                                                : "bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                                        )}>
                                            {listingState === 'EXPIRED' ? 'CLOSED' : 'OPEN'}
                                        </span>
                                    </div>

                                    {details.officialSourceVerified && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-lg">
                                            <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                            <span>Official Verified</span>
                                            {details.sourceLastCheckedAt && (
                                                <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
                                                    ({formatDate(String(details.sourceLastCheckedAt))})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {details.recruitingBody || details.organization || opp.company}
                                    </p>
                                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                                        {opp.title}
                                    </h1>
                                    {/* Job Categories */}
                                    {details.jobCategory && Array.isArray(details.jobCategory) && details.jobCategory.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {details.jobCategory.map((cat: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border border-border/50 rounded-full">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="shrink-0 self-start md:self-center">
                                <CompanyLogo
                                    companyName={opp.company}
                                    companyWebsite={opp.companyWebsite}
                                    companyLogoUrl={opp.companyLogoUrl}
                                    applyLink={opp.applyLink}
                                    isGovernment={true}
                                    className="w-14 h-14 md:w-20 md:h-20"
                                />
                            </div>
                        </div>

                        <p className="text-base text-muted-foreground leading-relaxed">
                            {getTightDescription(opp.description)}
                        </p>

                        {/* Top Summary Meta (Removed Advt No) */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50 text-sm">
                            <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Level</span>
                                <p className="font-bold text-foreground">{details.governmentLevel}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Vacancy Nature</span>
                                <p className="font-bold text-foreground">{details.vacancyNature || 'PERMANENT'}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Apply Mode</span>
                                <p className="font-bold text-foreground">{details.applicationMode || 'Online'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Overview Table */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                            <h3 className="text-sm font-semibold text-foreground">Quick Overview</h3>
                        </div>
                        <table className="w-full">
                            <tbody className="divide-y divide-border/40">
                                {([
                                    ['Conducting Body', details.recruitingBody || details.organization || opp.company],
                                    ['Total Vacancies', (details as any).totalVacancies ? Number((details as any).totalVacancies).toLocaleString() : null],
                                    ['Apply Online', parsedStartDate !== 'To Be Announced' || parsedEndDate !== 'To Be Announced' ? `${parsedStartDate} – ${parsedEndDate}` : null],
                                    ['Exam Date', parsedExamDate !== 'To Be Announced' ? parsedExamDate : null],
                                    ['Eligibility', (details as any).minimumQualification || (education.length > 0 ? ((education[0] as any)?.requirement || (education[0] as any)?.degree) : null)],
                                    ['Age Limit', ageLabel],
                                    ['Apply Mode', details.applicationMode || 'Online'],
                                    ['Exam Languages', details.extraMetadata?.languages || details.extraMetadata?.examLanguages ? (Array.isArray(details.extraMetadata.languages || details.extraMetadata.examLanguages) ? (details.extraMetadata.languages || details.extraMetadata.examLanguages).join(', ') : String(details.extraMetadata.languages || details.extraMetadata.examLanguages)) : null],
                                    ['Selection Process', Array.isArray(details.selectionStages) && details.selectionStages.length > 0
                                        ? details.selectionStages.map((s: any) => typeof s === 'string' ? s : s.name).join(' → ')
                                        : null],
                                    ['Official Website', details.officialWebsiteUrl || (opp as any).companyWebsite],
                                ] as [string, string | null | undefined][]).filter(([, val]) => val).map(([label, value], idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                                        <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground w-[38%] align-top">{label}</td>
                                        <td className="px-4 py-2.5 text-sm font-semibold text-foreground">
                                            {label === 'Official Website' && value && (value as string).startsWith('http') ? (
                                                <a href={value as string} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                                    {(() => { try { return new URL(value as string).hostname.replace('www.', ''); } catch { return value; } })()}
                                                </a>
                                            ) : value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile-Only Key Cards (Dates, Apply, Fee, Age) */}
                    <div className="lg:hidden space-y-4">
                        {renderKeyDates()}
                        {renderApplyPortal()}
                        {renderApplicationFee()}
                        {renderAgeCriteria()}
                    </div>

                    {/* Key Changes / Updates Alert Callout */}
                    {keyChangesList && Array.isArray(keyChangesList) && keyChangesList.length > 0 && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-amber-500/10">
                                <ExclamationTriangleIcon className="w-4.5 h-4.5 text-amber-500" />
                                <h3 className="text-sm font-semibold text-amber-800">
                                    Key Updates {keyChangesYear ? `in ${keyChangesYear}` : ''}
                                </h3>
                            </div>
                            <ul className="list-disc list-inside space-y-2 text-sm text-amber-900/80 leading-relaxed">
                                {keyChangesList.map((change: string, idx: number) => (
                                    <li key={idx} className="marker:text-amber-500">{change}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Salary & Benefits Section */}
                    {hasSalaryInfo && (
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <CurrencyRupeeIcon className="w-5 h-5 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Salary, Benefits & Career Path</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(details.basicPay || details.payLevel) && (
                                    <div className="bg-muted/10 border border-border/40 p-4 rounded-xl space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pay Scale & Structure</p>
                                        <div className="space-y-1">
                                            {details.basicPay && (
                                                <p className="text-2xl font-extrabold text-foreground tracking-tight">
                                                    ₹{Number(details.basicPay).toLocaleString('en-IN')}
                                                    <span className="text-xs font-medium text-muted-foreground ml-1.5">/ Month (Basic Pay)</span>
                                                </p>
                                            )}
                                            {details.payLevel && (
                                                <p className="text-sm font-semibold text-foreground/80">
                                                    Pay Level: <span className="font-bold text-foreground">{details.payLevel}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {details.allowances && details.allowances.length > 0 && (
                                    <div className="bg-muted/10 border border-border/40 p-4 rounded-xl space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allowances & Perks</p>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {details.allowances.map((allowance: string, idx: number) => (
                                                <span key={idx} className="px-2.5 py-1 text-xs font-semibold bg-primary/5 text-primary border border-primary/10 rounded-full">
                                                    {allowance}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Career Growth / Promotion Opportunities */}
                            {(details.extraMetadata?.promotionPath || details.extraMetadata?.promotionOpportunities || details.extraMetadata?.careerGrowth) && (() => {
                                const growthData = details.extraMetadata.promotionPath || details.extraMetadata.promotionOpportunities || details.extraMetadata.careerGrowth;
                                const stages = Array.isArray(growthData) ? growthData : [growthData];
                                return (
                                    <div className="pt-3 border-t border-border/40 space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Career Path & Promotion Opportunities</p>
                                        {Array.isArray(growthData) ? (
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                {stages.map((stage: string, idx: number) => (
                                                    <React.Fragment key={idx}>
                                                        <span className="px-3 py-1.5 text-xs font-semibold bg-muted border border-border/50 rounded-lg text-foreground">
                                                            {stage}
                                                        </span>
                                                        {idx < stages.length - 1 && (
                                                            <span className="text-muted-foreground text-xs font-bold font-mono">→</span>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground leading-relaxed">{growthData}</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Recruitment Highlights / Why Apply */}
                    {(details.extraMetadata?.importance || details.extraMetadata?.whyApply || details.extraMetadata?.highlights) && (() => {
                        const highlights = details.extraMetadata.importance || details.extraMetadata.whyApply || details.extraMetadata.highlights;
                        const highlightsList = Array.isArray(highlights) ? highlights : [highlights];
                        return (
                            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                    <ShieldCheckIcon className="w-5 h-5 text-muted-foreground" />
                                    <h3 className="text-base font-semibold text-foreground">Recruitment Highlights & Importance</h3>
                                </div>
                                <div className="space-y-3">
                                    {Array.isArray(highlights) ? (
                                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground leading-relaxed">
                                            {highlightsList.map((highlight: string, idx: number) => (
                                                <li key={idx} className="marker:text-primary"><span className="text-foreground/90 font-semibold">{highlight}</span></li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground leading-relaxed">{highlights}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Preparation Tips & Strategy Section */}
                    {(details.extraMetadata?.preparationTips || details.extraMetadata?.prepTips || details.extraMetadata?.studyStrategy) && (() => {
                        const tips = details.extraMetadata.preparationTips || details.extraMetadata.prepTips || details.extraMetadata.studyStrategy;
                        const tipsList = Array.isArray(tips) ? tips : [tips];
                        return (
                            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                    <AcademicCapIcon className="w-5 h-5 text-muted-foreground" />
                                    <h3 className="text-base font-semibold text-foreground">How to Prepare & Study Strategy</h3>
                                </div>
                                <div className="space-y-3">
                                    {Array.isArray(tips) ? (
                                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground leading-relaxed">
                                            {tipsList.map((tip: string, idx: number) => (
                                                <li key={idx} className="marker:text-primary"><span className="text-foreground/90 font-semibold">{tip}</span></li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground leading-relaxed">{tips}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Vacancy Trends - Moved near the top of the Left column */}
                    {vacancyTrends && typeof vacancyTrends === 'object' && Object.keys(vacancyTrends).length > 0 && (() => {
                        const trendEntries = Object.entries(vacancyTrends)
                            .map(([year, count]) => ({
                                year,
                                count: Number(count)
                            }))
                            .sort((a, b) => a.year.localeCompare(b.year));
                        const maxTrendCount = Math.max(...trendEntries.map(e => e.count), 1);
                        return (
                            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                    <UserGroupIcon className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="text-base font-semibold text-foreground">Vacancy Trends</h3>
                                </div>
                                <div className="pt-1">
                                    <div className="flex justify-between text-xs font-semibold text-muted-foreground pb-2 border-b border-border/30 mb-3">
                                        <span>Year</span>
                                        <span>Posts</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {trendEntries.map(({ year, count }) => {
                                            const percentage = (count / maxTrendCount) * 100;
                                            return (
                                                <div key={year} className="flex items-center gap-3 text-sm text-foreground">
                                                    <span className="w-10 text-sm text-muted-foreground shrink-0">{year}</span>
                                                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden border border-border/10">
                                                        <div 
                                                            className="h-full bg-slate-400/70 dark:bg-slate-500/70 rounded-full transition-all duration-500 ease-out" 
                                                            style={{ width: `${Math.max(percentage, 2)}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-16 text-right font-semibold text-foreground shrink-0">{count.toLocaleString()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Timeline of Important Dates */}
                    {timelineEvents.length > 0 && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Exam Schedule & Important Dates</h3>
                            </div>
                            <Timeline events={timelineEvents} />
                        </div>
                    )}

                    {/* Detailed Exam Stages & Schedule (examStages JSON field) - Moved below timeline */}
                    {examStagesList.length > 0 && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Exam Stages Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                {examStagesList.map((stage, idx) => (
                                    <div key={idx} className="flex justify-between items-start py-2 border-b border-border/30 last:border-0">
                                        <div className="space-y-0.5 pr-2">
                                            <p className="font-semibold text-foreground leading-tight">{stage.name}</p>
                                            {stage.notes && <p className="text-xs text-muted-foreground leading-relaxed">{stage.notes}</p>}
                                        </div>
                                        <span className="font-semibold text-foreground bg-muted border border-border/50 px-2 py-0.5 rounded text-xs shrink-0 whitespace-nowrap">
                                            {stage.date || 'TBA'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Post-wise Qualification Requirements */}
                    {details.qualificationDetails && Array.isArray(details.qualificationDetails) && details.qualificationDetails.length > 0 && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <AcademicCapIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Post-wise Qualification Requirements</h3>
                            </div>
                            <div className={cn(
                                "grid gap-3.5",
                                details.qualificationDetails.length === 1
                                    ? "grid-cols-1"
                                    : "grid-cols-1 md:grid-cols-2"
                            )}>
                                {details.qualificationDetails.map((q: any, idx: number) => (
                                    <div key={idx} className="bg-muted/10 border border-border/40 p-3 rounded-lg flex flex-col gap-1 justify-between">
                                        <p className="text-sm font-semibold text-foreground">{q.post || q.postName}</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{q.requirement || q.qualification}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}



                    {/* Guidelines & Required Documents */}
                    {(documents.length > 0 || instructions.length > 0 || details.reservationNotes) && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <DocumentDuplicateIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Guidelines & Required Documents</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                {/* Left Side: Required Documents */}
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required Documents</p>
                                    <div className="space-y-2.5">
                                        {validRequiredDocumentDetails.length > 0 ? (
                                            validRequiredDocumentDetails.map((doc: any, idx: any) => (
                                                <div key={idx} className="bg-muted/10 border border-border/45 p-3 rounded-lg flex flex-col justify-between space-y-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <p className="font-semibold text-foreground leading-snug">{doc.name}</p>
                                                        <span className={cn(
                                                            "text-[10px] font-semibold px-2 py-0.5 rounded border leading-none shrink-0",
                                                            doc.mandatory
                                                                ? "bg-destructive/5 text-destructive border-destructive/20"
                                                                : "bg-muted text-muted-foreground border-border"
                                                        )}>
                                                            {doc.mandatory ? 'Mandatory' : 'Optional'}
                                                        </span>
                                                    </div>
                                                    {doc.notes && <p className="text-sm text-muted-foreground leading-normal">{doc.notes}</p>}
                                                </div>
                                            ))
                                        ) : (
                                            documents.map((doc: any, idx: any) => (
                                                <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                                                    <span className="text-primary mt-0.5 shrink-0 font-extrabold text-sm leading-none">•</span>
                                                    <span className="text-foreground">{doc}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Important Instructions */}
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Important Instructions</p>
                                    <div className="space-y-2.5">
                                        {instructions.map((bullet: any, idx: any) => (
                                            <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                                                <span className="text-primary mt-0.5 shrink-0 font-extrabold text-sm leading-none">•</span>
                                                <span className="text-foreground/90 font-semibold">{bullet}</span>
                                            </div>
                                        ))}
                                        {details.reservationNotes && (
                                            <div className="pt-2.5 border-t border-border/50 mt-2.5">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reservation Policy</p>
                                                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{details.reservationNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Post-wise Vacancy Breakdown Table - Low/Light Table in Left Column */}
                    {vacancyTableData && vacancyTableData.rows.length > 0 && !isHeavyTable && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <DocumentTextIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Post-wise Vacancy Breakdown</h3>
                            </div>
                            <VacancyTable data={vacancyTableData!} />
                        </div>
                    )}

                    {/* Selection Process Stages - Mobile Only */}
                    <div className="lg:hidden">
                        {renderSelectionProcess(true)}
                    </div>

                    {/* Physical & Medical Standards - Mobile Only */}
                    <div className="lg:hidden">
                        {renderPhysicalStandards(true)}
                    </div>

                    {/* Collapsible Exam Centers Widget with Search - Mobile Only */}
                    {details.examCenters && Array.isArray(details.examCenters) && details.examCenters.length > 0 && (
                        <div className="lg:hidden">
                            <ExamCentersWidget centers={details.examCenters} />
                        </div>
                    )}

                </div>

                {/* Right Column (1/3 width) - Sidebar Actions, Dates, Fee, Age only */}
                <div className="space-y-4">
                    
                    {/* Sidebar: Important Dates */}
                    <div className="hidden lg:block">
                        {renderKeyDates()}
                    </div>

                    {/* Primary Action Card */}
                    <div className="hidden lg:block">
                        {renderApplyPortal()}
                    </div>

                    {/* Sidebar: Application Fee Details */}
                    <div className="hidden lg:block">
                        {renderApplicationFee()}
                    </div>

                    {/* Sidebar: Age Limits */}
                    <div className="hidden lg:block">
                        {renderAgeCriteria()}
                    </div>

                    {/* Sidebar: Selection Process */}
                    {renderSelectionProcess(false)}

                    {/* Sidebar: Physical Standards */}
                    {renderPhysicalStandards(false)}

                    {/* Sidebar: Collapsible Exam Centers Widget with Search - Desktop Only */}
                    {details.examCenters && Array.isArray(details.examCenters) && details.examCenters.length > 0 && (
                        <div className="hidden lg:block">
                            <ExamCentersWidget centers={details.examCenters} />
                        </div>
                    )}

                    {/* Sidebar: Step-by-Step Application Process */}
                    {((details as any).applicationProcess || (details.extraMetadata as any)?.applicationProcess) && 
                     (((details as any).applicationProcess || (details.extraMetadata as any)?.applicationProcess).length > 0) && (() => {
                        const steps = ((details as any).applicationProcess || (details.extraMetadata as any)?.applicationProcess) as string[];
                        return (
                            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                    <CheckCircleIcon className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold text-foreground">Step-by-Step Application Process</h3>
                                </div>
                                <ol className="space-y-3">
                                    {steps.map((step: string, idx: number) => (
                                        <li key={idx} className="flex gap-3 text-sm text-foreground leading-relaxed">
                                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold shrink-0 text-xs mt-0.5">
                                                {idx + 1}
                                            </span>
                                            <span className="text-foreground">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        );
                    })()}



                </div>
            </div>

            {/* Full-width Sections */}

            {((vacancyTableData && vacancyTableData.rows.length > 0 && isHeavyTable) || syllabusTabs.length > 0 || (examRules && typeof examRules === 'object' && Object.keys(examRules).length > 0) || (examRegions && Array.isArray(examRegions) && examRegions.length > 0) || cutOffData || postWiseSalary) && (
                <div className="space-y-4">

                    {/* Post-wise Vacancy Breakdown Table - Heavy Table Full Width */}
                    {vacancyTableData && vacancyTableData.rows.length > 0 && isHeavyTable && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <DocumentTextIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Post-wise Vacancy Breakdown</h3>
                            </div>
                            <VacancyTable data={vacancyTableData!} />
                        </div>
                    )}

                    {/* Exam Pattern & Syllabus */}
                    {syllabusTabs.length > 0 && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <AcademicCapIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Exam Pattern & Syllabus</h3>
                            </div>
                            <Tabs items={syllabusTabs} />
                        </div>
                    )}

                    {/* Post-wise Salary Table */}
                    {postWiseSalary && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <CurrencyRupeeIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Post-wise Pay Scale & Salary</h3>
                            </div>
                            <div className="border border-border rounded-lg overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="sticky top-0 z-10 bg-muted border-b border-border">
                                        <tr>
                                            {['Post', 'Pay Level', 'Pay Scale', 'Gross Salary'].map(h => (
                                                <th key={h} className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 bg-card">
                                        {(postWiseSalary as any[]).map((row: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                                <td className="p-3 font-medium text-foreground text-sm">{row.post}</td>
                                                <td className="p-3 text-muted-foreground text-sm whitespace-nowrap">{row.payLevel}</td>
                                                <td className="p-3 text-muted-foreground text-sm whitespace-nowrap">{row.payScale}</td>
                                                <td className="p-3 text-muted-foreground text-sm whitespace-nowrap">{row.grossSalary || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {helplineNumber && (
                                <p className="text-xs text-muted-foreground">
                                    📞 Helpline (Toll Free): <span className="font-semibold text-foreground">{helplineNumber}</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Previous Year Cut-off Marks */}
                    {cutOffData && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <ClipboardDocumentCheckIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Previous Year Cut-off Marks</h3>
                            </div>
                            <div className="space-y-6">
                                {(cutOffData as any[]).map((tierData: any, tIdx: number) => (
                                    <div key={tIdx} className="space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {tierData.year} — {tierData.tier || 'Tier 1'}
                                        </p>
                                        {Array.isArray(tierData.data) && tierData.data.length > 0 && (() => {
                                            // Group by post
                                            const posts = [...new Set((tierData.data as any[]).map((r: any) => r.post))];
                                            const categories = [...new Set((tierData.data as any[]).map((r: any) => r.category))];
                                            const getMarks = (cat: string, post: string) => {
                                                const match = (tierData.data as any[]).find((r: any) => r.category === cat && r.post === post);
                                                return match ? Number(match.marks).toFixed(2) : '—';
                                            };
                                            return (
                                                <div className="border border-border rounded-lg overflow-x-auto">
                                                    <table className="w-full text-left border-collapse text-xs">
                                                        <thead className="bg-muted border-b border-border">
                                                            <tr>
                                                                <th className="p-3 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Category</th>
                                                                {posts.map(p => (
                                                                    <th key={p} className="p-3 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{p}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/50 bg-card">
                                                            {categories.map(cat => (
                                                                <tr key={cat} className="hover:bg-muted/20">
                                                                    <td className="p-3 font-medium text-foreground">{cat}</td>
                                                                    {posts.map(post => (
                                                                        <td key={post} className="p-3 text-muted-foreground tabular-nums">{getMarks(cat, post)}</td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Important Rules & Policies */}
                    {examRules && typeof examRules === 'object' && Object.keys(examRules).length > 0 && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <ShieldCheckIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Important Rules & Policies</h3>
                            </div>
                            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                                {Object.entries(examRules).map(([title, ruleText]: [string, any]) => {
                                    const formattedTitle = title.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                    return (
                                        <div key={title} className="space-y-1">
                                            <p className="font-bold text-foreground uppercase text-[10px] tracking-wider">{formattedTitle}</p>
                                            <p className="mt-0.5">{ruleText}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Regional Offices & Websites */}
                    {examRegions && Array.isArray(examRegions) && examRegions.length > 0 && (
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-base font-semibold text-foreground">Exam Centers by Region</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {examRegions.map((reg: any, idx: number) => (
                                    <div key={idx} className="bg-muted/10 border border-border/40 p-3.5 rounded-lg flex flex-col gap-1.5 justify-between">
                                        <div>
                                            <p className="font-bold text-foreground text-sm">{reg.region}</p>
                                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                                <span className="font-semibold text-foreground/75 block text-[10px] uppercase tracking-wider mb-0.5">States:</span> {Array.isArray(reg.states) ? reg.states.join(', ') : reg.states || '-'}
                                            </p>
                                        </div>
                                        {reg.website && (
                                            <a
                                                href={reg.website.startsWith('http') ? reg.website : `https://${reg.website}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5 mt-3 self-start"
                                            >
                                                {reg.website}
                                                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* FAQ Section */}
            {details.extraMetadata?.faq && Array.isArray(details.extraMetadata.faq) && (details.extraMetadata.faq as any[]).length > 0 && (
                <FaqAccordion faqs={details.extraMetadata.faq as Array<{question?: string; q?: string; answer?: string; a?: string}>} />
            )}
        </div>
    );
}
