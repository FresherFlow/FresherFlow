import { BriefcaseIcon } from '@heroicons/react/24/outline';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { SmartTextarea } from '@/features/admin/ui/SmartTextarea';

interface JobInfoSectionProps {
    title: string;
    setTitle: (val: string) => void;
    company: string;
    setCompany: (val: string) => void;
    companyWebsite: string;
    setCompanyWebsite: (val: string) => void;
    companyLogoUrl: string;
    setCompanyLogoUrl: (val: string) => void;
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
    customSlug: string;
    setCustomSlug: (val: string) => void;
    duplicateCheckComponent?: React.ReactNode;
}

export function JobInfoSection({
    title, setTitle,
    company, setCompany,
    companyWebsite, setCompanyWebsite,
    companyLogoUrl, setCompanyLogoUrl,
    jobFunction, setJobFunction,
    employmentType, setEmploymentType,
    incentives, setIncentives,
    selectionProcess, setSelectionProcess,
    notesHighlights, setNotesHighlights,
    description, setDescription,
    customSlug, setCustomSlug,
    duplicateCheckComponent
}: JobInfoSectionProps) {
    return (
        <div className="space-y-5 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                <BriefcaseIcon className="w-4 h-4 text-muted-foreground" />
                Core details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SmartInput
                    label="Title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Frontend Engineer"
                />
                
                <SmartInput
                    label="Company"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google"
                />
            </div>

            {duplicateCheckComponent}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <SmartInput
                    label="Company website (logo)"
                    value={companyWebsite}
                    type="url"
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://wipro.com"
                />
                <SmartInput
                    label="Company Logo URL"
                    value={companyLogoUrl}
                    type="url"
                    onChange={(e) => setCompanyLogoUrl(e.target.value)}
                    placeholder="e.g. https://cdn.fresherflow.in/logos/rrb.png"
                />
                <SmartInput
                    label="Custom SEO Slug"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="e.g. ssc-cgl-2026 (Optional)"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <SmartInput
                    label="Function"
                    value={jobFunction}
                    onChange={(e) => setJobFunction(e.target.value)}
                    placeholder="e.g. Sales, Banking, IT"
                />
                <SmartInput
                    label="Employment type"
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    placeholder="e.g. Full Time, Permanent"
                />
                <SmartInput
                    label="Benefits"
                    value={incentives}
                    onChange={(e) => setIncentives(e.target.value)}
                    placeholder="e.g. Rs. 20,000 to 1,00,000"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SmartTextarea
                    label="Selection process"
                    value={selectionProcess}
                    onChange={(e) => setSelectionProcess(e.target.value)}
                    rows={3}
                    placeholder="e.g. Aptitude Test > Technical Interview > HR Round"
                />
                <SmartTextarea
                    label="Notes / highlights"
                    value={notesHighlights}
                    onChange={(e) => setNotesHighlights(e.target.value)}
                    rows={3}
                    placeholder="e.g. Bond: 12 months, Training: 3 months, Immediate joiners preferred"
                />
            </div>

            <SmartTextarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                helpText={<>Supports line breaks, bullet lines like <span className="font-mono">- Requirement</span>, and bold section headings like <span className="font-mono">**Responsibilities**</span>.</>}
                placeholder={"**Responsibilities**\n- Build features\n- Write tests\n\n**Requirements**\n- React\n- TypeScript"}
            />
        </div>
    );
}
