import { BriefcaseIcon } from '@heroicons/react/24/outline';

interface JobInfoSectionProps {
    title: string;
    setTitle: (val: string) => void;
    company: string;
    setCompany: (val: string) => void;
    companyWebsite: string;
    setCompanyWebsite: (val: string) => void;
    jobFunction: string;
    setJobFunction: (val: string) => void;
    employmentType: string;
    setEmploymentType: (val: string) => void;
    incentives: string;
    setIncentives: (val: string) => void;
    selectionProcess: string;
    setSelectionProcess: (val: string) => void;
    notesHighlights: string;
    setNotesHighlights: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    duplicateCheckComponent?: React.ReactNode;
}

export function JobInfoSection({
    title, setTitle,
    company, setCompany,
    companyWebsite, setCompanyWebsite,
    jobFunction, setJobFunction,
    employmentType, setEmploymentType,
    incentives, setIncentives,
    selectionProcess, setSelectionProcess,
    notesHighlights, setNotesHighlights,
    description, setDescription,
    duplicateCheckComponent
}: JobInfoSectionProps) {
    return (
        <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                <BriefcaseIcon className="w-4 h-4 text-muted-foreground" />
                Core details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title *</label>
                    <input
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                        placeholder="e.g. Frontend Engineer"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company *</label>
                    <input
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                        placeholder="e.g. Google"
                    />
                </div>
            </div>

            {duplicateCheckComponent}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company website (logo)</label>
                    <input
                        type="url"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                        placeholder="https://wipro.com"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Function</label>
                    <input
                        value={jobFunction}
                        onChange={(e) => setJobFunction(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                        placeholder="e.g. Sales, Banking, IT"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employment type</label>
                    <input
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                        placeholder="e.g. Full Time, Permanent"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Benefits</label>
                    <input
                        value={incentives}
                        onChange={(e) => setIncentives(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                        placeholder="e.g. Rs. 20,000 to 1,00,000"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selection process</label>
                    <textarea
                        value={selectionProcess}
                        onChange={(e) => setSelectionProcess(e.target.value)}
                        rows={3}
                        className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-y transition-all shadow-sm"
                        placeholder="e.g. Aptitude Test > Technical Interview > HR Round"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes / highlights</label>
                    <textarea
                        value={notesHighlights}
                        onChange={(e) => setNotesHighlights(e.target.value)}
                        rows={3}
                        className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-y transition-all shadow-sm"
                        placeholder="e.g. Bond: 12 months, Training: 3 months, Immediate joiners preferred"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    className="flex min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y transition-all shadow-sm"
                    placeholder="Roles and responsibilities..."
                />
            </div>
        </div>
    );
}
