import { BriefcaseIcon } from '@heroicons/react/24/outline';
import { CDN_URL } from '@/lib/utils/runtimeConfig';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { SmartTextarea } from '@/features/admin/ui/SmartTextarea';
import { Card, CardDescription, CardContent } from '@/ui/Card';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

export function JobInfoSection({
    form,
    duplicateCheckComponent
}: {
    form: OpportunityFormApi;
    duplicateCheckComponent?: React.ReactNode;
}) {
    const {
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
    } = form;
    return (
        <Card>
            <div className="p-4 md:p-5 pb-3 space-y-1">
                <h3 className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground">
                    <BriefcaseIcon className="w-4 h-4 text-muted-foreground" />
                    Core details
                </h3>
                <CardDescription>
                    Title, company and the description candidates read.
                </CardDescription>
            </div>
            <CardContent className="space-y-5 px-4 md:px-5 pb-4 md:pb-5">
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
                    placeholder={`e.g. ${CDN_URL}/logos/rrb.png`}
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
            </CardContent>
        </Card>
    );
}
