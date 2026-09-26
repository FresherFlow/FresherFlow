import BuildingOffice2Icon from '@heroicons/react/24/outline/BuildingOffice2Icon';
import { ChevronRight } from 'lucide-react';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { SmartTextarea } from '@/features/admin/ui/SmartTextarea';
import { SmartSelect } from '@/features/admin/ui/SmartSelect';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/Collapsible';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

const hasText = (...values: (string | undefined)[]) =>
    values.some((value) => (value ?? '').trim().length > 0);

/**
 * One collapsible group inside the government section. Sections open by
 * default when they already hold values (editing) so admins see filled data,
 * and stay collapsed when empty (creating) so the notice scans fast.
 */
function GovtSubSection({
    number,
    title,
    defaultOpen = true,
    children,
}: {
    number: string;
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Collapsible defaultOpen={defaultOpen} className="group/govt overflow-hidden">
            <div className="rounded-xl border border-border/60 bg-card">
                <CollapsibleTrigger className="block w-full text-left">
                    <span className="flex w-full items-center gap-2.5 rounded-xl px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group-data-[state=open]/govt:rounded-t-xl">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                            {number}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/govt:rotate-90" />
                    </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-4 py-4">
                        {children}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

export function GovernmentJobSection({ form }: { form: OpportunityFormApi }) {
    // The section's historic field names (`department`, `organization`) map to
    // the hook's `governmentDepartment` / `governmentOrganization` states.
    const props = {
        ...form,
        department: form.governmentDepartment,
        setDepartment: form.setGovernmentDepartment,
        organization: form.governmentOrganization,
        setOrganization: form.setGovernmentOrganization,
    };
    const vacancyOpen = hasText(
        props.vacancyCount, props.vacancyBreakdownJson, props.categoryVacanciesJson,
        props.cadreDetailsJson, props.postPreferencesJson, props.serviceBondJson
    );
    const eligibilityOpen = hasText(
        props.ageMin, props.ageMax, props.ageRelaxation, props.reservationNotes,
        props.reservationDetailsJson, props.ageRelaxationRulesJson, props.eligibilityDetailsJson,
        props.qualificationDetailsJson, props.physicalStandardsJson
    );
    const feesOpen = hasText(props.applicationFee, props.applicationFeeJson, props.feeBreakdownJson);
    const datesOpen = hasText(
        props.notificationIssuedDate, props.applicationStartDate, props.applicationEndDate,
        props.examDate, props.admitCardDate, props.resultDate
    );
    const examOpen = hasText(
        props.applicationMode, props.examCenters, props.selectionStages, props.importantInstructions,
        props.examDatesJson, props.examPatternJson, props.skillTestsJson, props.examStagesJson,
        props.cutOffMarksJson, props.importantDatesJson
    );
    const linksOpen = hasText(
        props.officialWebsiteUrl, props.officialNotificationUrl, props.notificationPdfUrl,
        props.admitCardUrl, props.resultUrl, props.answerKeyUrl, props.syllabusUrl,
        props.previousPapersUrl, props.governmentRequiredDocuments, props.governmentRequiredDocumentsJson,
        props.referenceLinksJson, props.extraMetadataJson, props.governmentTags
    );

    return (
        <Card>
            <div className="space-y-8 p-5 md:p-7">
                <div className="flex items-center gap-3 border-b border-border/40 pb-4 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground border border-border/50">
                        <BuildingOffice2Icon className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground tracking-tight">
                            Government Job Details
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Official notice data for trust, structured SEO, and future filters.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 items-start">
                    {/* Column 1: Info, Vacancy, Eligibility, Fees */}
                    <div className="space-y-3">
                        {/* Section 1: Basic Info */}
                        <GovtSubSection number="1" title="Basic Info & Classification">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Department" value={props.department} onChange={props.setDepartment} placeholder="e.g. Central Government" />
                                <Field label="Organization" value={props.organization} onChange={props.setOrganization} placeholder="e.g. Staff Selection Commission" />
                                <Field label="Recruiting Body" value={props.recruitingBody} onChange={props.setRecruitingBody} placeholder="e.g. SSC / IBPS / RRB" />
                                <Field label="Exam Name" value={props.examName} onChange={props.setExamName} placeholder="e.g. SSC CGL 2026" />
                                <Field label="Post Name" value={props.postName} onChange={props.setPostName} placeholder="e.g. CGL / Constable" />
                                <Field label="Basic Pay" value={props.basicPay} onChange={props.setBasicPay} placeholder="e.g. 56100" />
                                <Field label="Pay Level" value={props.payLevel} onChange={props.setPayLevel} placeholder="e.g. Level 10" />
                                <Field label="Allowances" value={props.allowances} onChange={props.setAllowances} placeholder="e.g. DA, HRA, TA" />
                                <SelectField
                                    label="Application Status"
                                    value={props.applicationStatus}
                                    onChange={props.setApplicationStatus}
                                    options={[
                                        { value: 'UPCOMING', label: 'Upcoming' },
                                        { value: 'OPEN', label: 'Open' },
                                        { value: 'CLOSED', label: 'Closed' },
                                        { value: 'EXAM_SCHEDULED', label: 'Exam Scheduled' },
                                        { value: 'ADMIT_CARD_RELEASED', label: 'Admit Card Released' },
                                        { value: 'ANSWER_KEY_RELEASED', label: 'Answer Key Released' },
                                        { value: 'RESULT_DECLARED', label: 'Result Declared' },
                                        { value: 'COUNSELLING', label: 'Counselling' },
                                        { value: 'DOCUMENT_VERIFICATION', label: 'Document Verification' },
                                        { value: 'COMPLETED', label: 'Completed' },
                                        { value: 'CANCELLED', label: 'Cancelled' },
                                    ]}
                                />
                                <SelectField
                                    label="Government Level"
                                    value={props.governmentLevel}
                                    onChange={props.setGovernmentLevel}
                                    options={[
                                        { value: 'CENTRAL', label: 'Central (Union)' },
                                        { value: 'STATE', label: 'State Government' },
                                        { value: 'PSU', label: 'Public Sector Undertaking (PSU)' },
                                        { value: 'BANKING', label: 'Banking & Financial' },
                                        { value: 'DEFENCE', label: 'Defence & Paramilitary' },
                                        { value: 'JUDICIARY', label: 'Judiciary & Legal' },
                                        { value: 'EDUCATION', label: 'Education & Teaching' },
                                    ]}
                                />
                                <SelectField
                                    label="Vacancy Nature"
                                    value={props.vacancyNature}
                                    onChange={props.setVacancyNature}
                                    options={[
                                        { value: 'PERMANENT', label: 'Permanent / Direct' },
                                        { value: 'TEMPORARY', label: 'Temporary' },
                                        { value: 'CONTRACT', label: 'Contractual' },
                                        { value: 'APPRENTICESHIP', label: 'Apprenticeship' },
                                        { value: 'DEPUTATION', label: 'Deputation' },
                                    ]}
                                />
                                <Field label="Job Categories" value={props.jobCategory} onChange={props.setJobCategory} placeholder="e.g. Graduate, SSC, Group B (comma separated)" />
                                <Field label="Advertisement Number" value={props.advertisementNumber} onChange={props.setAdvertisementNumber} placeholder="e.g. SSC/2026/01" />
                                <div className="flex items-center gap-2 pt-6">
                                    <Checkbox
                                        id="officialSourceVerified"
                                        checked={props.officialSourceVerified}
                                        onCheckedChange={(checked) => props.setOfficialSourceVerified(checked === true)}
                                    />
                                    <label htmlFor="officialSourceVerified" className="text-sm font-medium text-foreground">
                                        Official Source Verified
                                    </label>
                                </div>
                            </div>
                        </GovtSubSection>

                        {/* Section 2: Vacancy Details */}
                        <GovtSubSection number="2" title="Vacancy Details" defaultOpen={vacancyOpen}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Field label="Vacancy Count" type="number" value={props.vacancyCount} onChange={props.setVacancyCount} placeholder="e.g. 250" />
                                </div>
                                <div className="md:col-span-2">
                                    <JsonArea label="Vacancy Breakdown (JSON)" value={props.vacancyBreakdownJson} onChange={props.setVacancyBreakdownJson} rows={6} placeholder={`[\n  {\n    "postName": "Constable (Driver)",\n    "total": 553,\n    "categoryBreakup": { "general": 230, "obc": 149, "sc": 83, "st": 41 }\n  }\n]`} help="Post-wise vacancy breakdown is the real govt-job structure." />
                                </div>
                                <JsonArea label="Category Vacancies (JSON)" value={props.categoryVacanciesJson} onChange={props.setCategoryVacanciesJson} rows={4} placeholder={`{ "general": 230, "obc": 149 }`} help="Top-level category vacancies." />
                                <JsonArea label="Cadre Details (JSON)" value={props.cadreDetailsJson} onChange={props.setCadreDetailsJson} rows={4} placeholder={`[]`} help="Cadre allocations." />
                                <JsonArea label="Post Preferences (JSON)" value={props.postPreferencesJson} onChange={props.setPostPreferencesJson} rows={4} placeholder={`[]`} help="Available preferences." />
                                <JsonArea label="Service Bond (JSON)" value={props.serviceBondJson} onChange={props.setServiceBondJson} rows={4} placeholder={`{ "amount": 50000, "durationYears": 3 }`} help="Service bond terms." />
                            </div>
                        </GovtSubSection>

                        {/* Section 4: Eligibility & Qualifications */}
                        <GovtSubSection number="4" title="Eligibility & Qualifications" defaultOpen={eligibilityOpen}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Age Min" type="number" value={props.ageMin} onChange={props.setAgeMin} placeholder="18" />
                                <Field label="Age Max" type="number" value={props.ageMax} onChange={props.setAgeMax} placeholder="27" />
                                <Area label="Age Relaxation" value={props.ageRelaxation} onChange={props.setAgeRelaxation} placeholder="As per official rules for reserved categories." rows={3} />
                                <Area label="Reservation Notes" value={props.reservationNotes} onChange={props.setReservationNotes} placeholder="Category-wise reservation / domicile notes / women reservation." rows={3} />
                                <JsonArea label="Reservation Details (JSON)" value={props.reservationDetailsJson} onChange={props.setReservationDetailsJson} rows={4} placeholder={`{ "categories": ["OBC", "SC", "ST"] }`} help="Detailed reservation criteria." />
                                <JsonArea label="Age Relaxation Rules (JSON)" value={props.ageRelaxationRulesJson} onChange={props.setAgeRelaxationRulesJson} rows={4} placeholder={`[]`} help="Rules for reserved categories." />
                                <JsonArea label="Eligibility Details (JSON)" value={props.eligibilityDetailsJson} onChange={props.setEligibilityDetailsJson} rows={5} placeholder={`{\n  "education": ["10th Pass / Matriculation"],\n  "age": { "min": 18, "max": 27 },\n  "additional": ["Trade skill varies by post"]\n}`} help="Use this instead of burying eligibility inside description." />
                                <JsonArea label="Qualification Details (JSON)" value={props.qualificationDetailsJson} onChange={props.setQualificationDetailsJson} rows={5} placeholder={`[\n  { "post": "JSO", "requirement": "Bachelor's Degree in Statistics" }\n]`} help="Post-wise education details." />
                                <div className="md:col-span-2">
                                    <JsonArea label="Physical Standards (JSON)" value={props.physicalStandardsJson} onChange={props.setPhysicalStandardsJson} rows={5} placeholder={`{\n  "applicablePosts": ["Sub-Inspector"],\n  "notes": "Physical standards apply"\n}`} help="Height, weight, and vision standards." />
                                </div>
                            </div>
                        </GovtSubSection>

                        {/* Section 6: Fees */}
                        <GovtSubSection number="6" title="Application Fees" defaultOpen={feesOpen}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Area label="Application Fee" value={props.applicationFee} onChange={props.setApplicationFee} placeholder="General/OBC: Rs.100, SC/ST/PwBD/Women: Nil" rows={2} />
                                </div>
                                <JsonArea label="Application Fee (JSON)" value={props.applicationFeeJson} onChange={props.setApplicationFeeJson} rows={4} placeholder={`{\n  "general": 100,\n  "obc": 100,\n  "sc": 0,\n  "st": 0,\n  "pwd": 0,\n  "female": 0\n}`} help="Machine-readable fee map for filters and future badges." />
                                <JsonArea label="Fee Breakdown (JSON)" value={props.feeBreakdownJson} onChange={props.setFeeBreakdownJson} rows={4} placeholder={`{\n  "General": 100,\n  "OBC": 100,\n  "SC": 0\n}`} help="Detailed fee breakup mapping." />
                            </div>
                        </GovtSubSection>
                    </div>

                    {/* Column 2: Dates, Exam, Links */}
                    <div className="space-y-3">
                        {/* Section 3: Key Dates */}
                        <GovtSubSection number="3" title="Key Dates" defaultOpen={datesOpen}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Notification Date" value={props.notificationIssuedDate} onChange={props.setNotificationIssuedDate} placeholder="2026-05-21" />
                                <Field label="Application Start" value={props.applicationStartDate} onChange={props.setApplicationStartDate} placeholder="e.g. 27 March 2026" />
                                <Field label="Application End" value={props.applicationEndDate} onChange={props.setApplicationEndDate} placeholder="e.g. 25 April 2026" />
                                <Field label="Exam Date" value={props.examDate} onChange={props.setExamDate} placeholder="e.g. 12 June 2026 / To be announced" />
                                <Field label="Admit Card Date" value={props.admitCardDate} onChange={props.setAdmitCardDate} placeholder="e.g. Before exam" />
                                <Field label="Result Date" value={props.resultDate} onChange={props.setResultDate} placeholder="e.g. Will be notified" />
                            </div>
                        </GovtSubSection>

                        {/* Section 5: Exam & Selection Process */}
                        <GovtSubSection number="5" title="Exam & Selection Process" defaultOpen={examOpen}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Application Mode" value={props.applicationMode} onChange={props.setApplicationMode} placeholder="e.g. Online" />
                                <Field label="Exam Centers" value={props.examCenters} onChange={props.setExamCenters} placeholder="Agra, Patna, Delhi (comma separated)" />
                                <Area label="Selection Stages" value={props.selectionStages} onChange={props.setSelectionStages} placeholder="Tier 1 CBT, Tier 2, Interview, Document Verification" rows={2} />
                                <Area label="Important Instructions" value={props.importantInstructions} onChange={props.setImportantInstructions} placeholder="Upload rules, signature/photo format, official cautions." rows={3} />
                                <JsonArea label="Exam Dates (JSON)" value={props.examDatesJson} onChange={props.setExamDatesJson} rows={4} placeholder={`{\n  "prelims": "",\n  "mains": "",\n  "skillTest": "",\n  "interview": ""\n}`} help="Keep each stage independent so updates stay clean." />
                                <JsonArea label="Exam Pattern (JSON)" value={props.examPatternJson} onChange={props.setExamPatternJson} rows={5} placeholder={`{\n  "tiers": [\n    {\n      "name": "Tier I",\n      "mode": "CBT",\n      "durationMinutes": 60,\n      "totalQuestions": 100,\n      "totalMarks": 200\n    }\n  ]\n}`} help="Structure of exams/sections/syllabus." />
                                <JsonArea label="Skill Tests (JSON)" value={props.skillTestsJson} onChange={props.setSkillTestsJson} rows={4} placeholder={`[\n  {\n    "name": "Data Entry Speed Test",\n    "mandatory": false,\n    "qualifying": true,\n    "durationMinutes": 15\n  }\n]`} help="Typing or physical tests required." />
                                <JsonArea label="Exam Stages (JSON)" value={props.examStagesJson} onChange={props.setExamStagesJson} rows={4} placeholder={`[]`} help="Stage-by-stage date details." />
                                <JsonArea label="Cut Off Marks (JSON)" value={props.cutOffMarksJson} onChange={props.setCutOffMarksJson} rows={4} placeholder={`[\n  { "year": "2025", "category": "General", "marks": 130 }\n]`} help="Previous cut-off marks for this exam." />
                                <JsonArea label="Important Dates (JSON)" value={props.importantDatesJson} onChange={props.setImportantDatesJson} rows={4} placeholder={`[\n  { "label": "Apply Online Starts", "date": "2026-05-21" }\n]`} help="Key timeline dates breakdown." />
                            </div>
                        </GovtSubSection>

                        {/* Section 7: Documents, Links & Extra */}
                        <GovtSubSection number="7" title="Links, Documents & Extra" defaultOpen={linksOpen}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Official Website" type="url" value={props.officialWebsiteUrl} onChange={props.setOfficialWebsiteUrl} placeholder="https://..." />
                                <Field label="Official Notification URL" type="url" value={props.officialNotificationUrl} onChange={props.setOfficialNotificationUrl} placeholder="https://..." />
                                <Field label="Notification PDF URL" type="url" value={props.notificationPdfUrl} onChange={props.setOfficialNotificationUrl} placeholder="https://..." />
                                <Field label="Admit Card URL" type="url" value={props.admitCardUrl} onChange={props.setAdmitCardUrl} placeholder="https://..." />
                                <Field label="Result URL" type="url" value={props.resultUrl} onChange={props.setResultUrl} placeholder="https://..." />
                                <Field label="Answer Key URL" type="url" value={props.answerKeyUrl} onChange={props.setAnswerKeyUrl} placeholder="https://..." />
                                <Field label="Syllabus URL" type="url" value={props.syllabusUrl} onChange={props.setSyllabusUrl} placeholder="https://..." />
                                <Field label="Previous Papers URL" type="url" value={props.previousPapersUrl} onChange={props.setPreviousPapersUrl} placeholder="https://..." />
                            
                                <Area label="Required Documents" value={props.governmentRequiredDocuments} onChange={props.setGovernmentRequiredDocuments} placeholder="Photo ID, Degree certificate, Category certificate" rows={3} />
                                <JsonArea label="Required Documents (JSON)" value={props.governmentRequiredDocumentsJson} onChange={props.setGovernmentRequiredDocumentsJson} rows={4} placeholder={`[\n  { "name": "10th Certificate", "mandatory": true },\n  { "name": "Category Certificate", "mandatory": false }\n]`} help="Structured docs help us show mandatory vs conditional proof properly." />
                                <JsonArea label="Reference Links (JSON)" value={props.referenceLinksJson} onChange={props.setReferenceLinksJson} rows={4} placeholder={`[\n  { "title": "Apply Here", "url": "..." }\n]`} help="Useful external references." />
                                <JsonArea label="Extra Metadata (JSON)" value={props.extraMetadataJson} onChange={props.setExtraMetadataJson} rows={4} placeholder={`{\n  "changesIn2026": [],\n  "vacancyTrend": {}\n}`} help="Any other structured parameters." />
                                <div className="md:col-span-2">
                                    <Area label="SEO / Search Tags" value={props.governmentTags} onChange={props.setGovernmentTags} placeholder="Government Job, SSC Vacancy, Graduate Jobs, Central Government" rows={3} help="Comma-separated tags like Government Job, SSC, Graduate Jobs, Central Government." />
                                </div>
                            </div>
                        </GovtSubSection>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function SelectField({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <SmartSelect
            label={label}
            value={value}
            onChange={onChange}
            options={options}
        />
    );
}

function JsonArea({
    label,
    value,
    onChange,
    rows,
    placeholder,
    help,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows: number;
    placeholder?: string;
    help?: string;
}) {
    return <Area label={label} value={value} onChange={onChange} rows={rows} placeholder={placeholder} help={help} />;
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <SmartInput
            label={label}
            value={value}
            type={type}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    );
}

function Area({
    label,
    value,
    onChange,
    placeholder,
    rows,
    help,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows: number;
    help?: string;
}) {
    return (
        <SmartTextarea
            label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            helpText={help}
        />
    );
}
