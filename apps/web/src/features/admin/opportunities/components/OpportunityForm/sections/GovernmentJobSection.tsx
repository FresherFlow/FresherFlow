import BuildingOffice2Icon from '@heroicons/react/24/outline/BuildingOffice2Icon';

interface GovernmentJobSectionProps {
    governmentTags: string;
    setGovernmentTags: (value: string) => void;
    department: string;
    setDepartment: (value: string) => void;
    organization: string;
    setOrganization: (value: string) => void;
    recruitingBody: string;
    setRecruitingBody: (value: string) => void;
    officialWebsiteUrl: string;
    setOfficialWebsiteUrl: (value: string) => void;
    officialNotificationUrl: string;
    setOfficialNotificationUrl: (value: string) => void;
    advertisementNumber: string;
    setAdvertisementNumber: (value: string) => void;
    postName: string;
    setPostName: (value: string) => void;
    applicationMode: string;
    setApplicationMode: (value: string) => void;
    vacancyCount: string;
    setVacancyCount: (value: string) => void;
    vacancyBreakdownJson: string;
    setVacancyBreakdownJson: (val: string) => void;
    applicationFee: string;
    setApplicationFee: (value: string) => void;
    applicationFeeJson: string;
    setApplicationFeeJson: (value: string) => void;
    ageMin: string;
    setAgeMin: (value: string) => void;
    ageMax: string;
    setAgeMax: (value: string) => void;
    ageRelaxation: string;
    setAgeRelaxation: (value: string) => void;
    eligibilityDetailsJson: string;
    setEligibilityDetailsJson: (value: string) => void;
    reservationNotes: string;
    setReservationNotes: (value: string) => void;
    importantInstructions: string;
    setImportantInstructions: (value: string) => void;
    applicationStartDate: string;
    setApplicationStartDate: (value: string) => void;
    applicationEndDate: string;
    setApplicationEndDate: (value: string) => void;
    notificationIssuedDate: string;
    setNotificationIssuedDate: (value: string) => void;
    examDate: string;
    setExamDate: (value: string) => void;
    examDatesJson: string;
    setExamDatesJson: (value: string) => void;
    admitCardDate: string;
    setAdmitCardDate: (value: string) => void;
    resultDate: string;
    setResultDate: (value: string) => void;
    selectionStages: string;
    setSelectionStages: (value: string) => void;
    governmentRequiredDocuments: string;
    setGovernmentRequiredDocuments: (value: string) => void;
    governmentRequiredDocumentsJson: string;
    setGovernmentRequiredDocumentsJson: (value: string) => void;

    // Missing Props
    examName: string;
    setExamName: (value: string) => void;
    categoryVacanciesJson: string;
    setCategoryVacanciesJson: (value: string) => void;
    cadreDetailsJson: string;
    setCadreDetailsJson: (value: string) => void;
    postPreferencesJson: string;
    setPostPreferencesJson: (value: string) => void;
    serviceBondJson: string;
    setServiceBondJson: (value: string) => void;
    reservationDetailsJson: string;
    setReservationDetailsJson: (value: string) => void;
    referenceLinksJson: string;
    setReferenceLinksJson: (value: string) => void;
    cutOffMarksJson: string;
    setCutOffMarksJson: (value: string) => void;

    // New Fields
    examCenters: string;
    setExamCenters: (value: string) => void;
    examPatternJson: string;
    setExamPatternJson: (value: string) => void;
    skillTestsJson: string;
    setSkillTestsJson: (value: string) => void;
    examStagesJson: string;
    setExamStagesJson: (value: string) => void;
    importantDatesJson: string;
    setImportantDatesJson: (value: string) => void;
    qualificationDetailsJson: string;
    setQualificationDetailsJson: (value: string) => void;
    physicalStandardsJson: string;
    setPhysicalStandardsJson: (value: string) => void;
    extraMetadataJson: string;
    setExtraMetadataJson: (value: string) => void;
    feeBreakdownJson: string;
    setFeeBreakdownJson: (value: string) => void;
    ageRelaxationRulesJson: string;
    setAgeRelaxationRulesJson: (value: string) => void;
    officialSourceVerified: boolean;
    setOfficialSourceVerified: (value: boolean) => void;
    notificationPdfUrl: string;
    setNotificationPdfUrl: (value: string) => void;
    admitCardUrl: string;
    setAdmitCardUrl: (value: string) => void;
    resultUrl: string;
    setResultUrl: (value: string) => void;
    answerKeyUrl: string;
    setAnswerKeyUrl: (value: string) => void;
    syllabusUrl: string;
    setSyllabusUrl: (value: string) => void;
    previousPapersUrl: string;
    setPreviousPapersUrl: (value: string) => void;
    applicationStatus: string;
    setApplicationStatus: (value: string) => void;
    governmentLevel: string;
    setGovernmentLevel: (value: string) => void;
    vacancyNature: string;
    setVacancyNature: (value: string) => void;
    jobCategory: string;
    setJobCategory: (value: string) => void;
}

export function GovernmentJobSection(props: GovernmentJobSectionProps) {
    return (
        <div className="space-y-8 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <div>
                <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                    <BuildingOffice2Icon className="w-4 h-4 text-muted-foreground" />
                    Government Job Details
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Use only official notice data here. These fields improve trust, structured SEO, and future filters for government listings.
                </p>
            </div>

            {/* Section 1: Basic Info */}
            <div className="space-y-4 border-l-4 border-primary pl-4 py-1">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">1. Basic Info & Classification</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Department" value={props.department} onChange={props.setDepartment} placeholder="e.g. Central Government" />
                    <Field label="Organization" value={props.organization} onChange={props.setOrganization} placeholder="e.g. Staff Selection Commission" />
                    <Field label="Recruiting Body" value={props.recruitingBody} onChange={props.setRecruitingBody} placeholder="e.g. SSC / IBPS / RRB" />
                    <Field label="Exam Name" value={props.examName} onChange={props.setExamName} placeholder="e.g. SSC CGL 2026" />
                    <Field label="Post Name" value={props.postName} onChange={props.setPostName} placeholder="e.g. CGL / Constable" />
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
                        <input
                            type="checkbox"
                            id="officialSourceVerified"
                            checked={props.officialSourceVerified}
                            onChange={(e) => props.setOfficialSourceVerified(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="officialSourceVerified" className="text-sm font-medium text-foreground">
                            Official Source Verified
                        </label>
                    </div>
                </div>
            </div>

            {/* Section 2: Vacancy Details */}
            <div className="space-y-4 border-l-4 border-blue-500 pl-4 py-1">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">2. Vacancy Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Vacancy Count" type="number" value={props.vacancyCount} onChange={props.setVacancyCount} placeholder="e.g. 250" />
                    <div className="md:col-span-2">
                        <JsonArea label="Vacancy Breakdown (JSON)" value={props.vacancyBreakdownJson} onChange={props.setVacancyBreakdownJson} rows={6} placeholder={`[\n  {\n    "postName": "Constable (Driver)",\n    "total": 553,\n    "categoryBreakup": { "general": 230, "obc": 149, "sc": 83, "st": 41 }\n  }\n]`} help="Post-wise vacancy breakdown is the real govt-job structure." />
                    </div>
                    <JsonArea label="Category Vacancies (JSON)" value={props.categoryVacanciesJson} onChange={props.setCategoryVacanciesJson} rows={6} placeholder={`{ "general": 230, "obc": 149 }`} help="Top-level category vacancies." />
                    <JsonArea label="Cadre Details (JSON)" value={props.cadreDetailsJson} onChange={props.setCadreDetailsJson} rows={6} placeholder={`[]`} help="Cadre allocations." />
                    <JsonArea label="Post Preferences (JSON)" value={props.postPreferencesJson} onChange={props.setPostPreferencesJson} rows={6} placeholder={`[]`} help="Available preferences." />
                    <JsonArea label="Service Bond (JSON)" value={props.serviceBondJson} onChange={props.setServiceBondJson} rows={6} placeholder={`{ "amount": 50000, "durationYears": 3 }`} help="Service bond terms." />
                </div>
            </div>

            {/* Section 3: Key Dates */}
            <div className="space-y-4 border-l-4 border-green-500 pl-4 py-1">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">3. Key Dates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Notification Date" value={props.notificationIssuedDate} onChange={props.setNotificationIssuedDate} placeholder="2026-05-21" />
                    <Field label="Application Start" value={props.applicationStartDate} onChange={props.setApplicationStartDate} placeholder="e.g. 27 March 2026" />
                    <Field label="Application End" value={props.applicationEndDate} onChange={props.setApplicationEndDate} placeholder="e.g. 25 April 2026" />
                    <Field label="Exam Date" value={props.examDate} onChange={props.setExamDate} placeholder="e.g. 12 June 2026 / To be announced" />
                    <Field label="Admit Card Date" value={props.admitCardDate} onChange={props.setAdmitCardDate} placeholder="e.g. Before exam" />
                    <Field label="Result Date" value={props.resultDate} onChange={props.setResultDate} placeholder="e.g. Will be notified" />
                </div>
            </div>

            {/* Section 4: Eligibility & Qualifications */}
            <div className="space-y-4 border-l-4 border-yellow-500 pl-4 py-1">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">4. Eligibility & Qualifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Age Min" type="number" value={props.ageMin} onChange={props.setAgeMin} placeholder="18" />
                    <Field label="Age Max" type="number" value={props.ageMax} onChange={props.setAgeMax} placeholder="27" />
                    <Area label="Age Relaxation" value={props.ageRelaxation} onChange={props.setAgeRelaxation} placeholder="As per official rules for reserved categories." rows={3} />
                    <Area label="Reservation Notes" value={props.reservationNotes} onChange={props.setReservationNotes} placeholder="Category-wise reservation / domicile notes / women reservation." rows={3} />
                    <JsonArea label="Reservation Details (JSON)" value={props.reservationDetailsJson} onChange={props.setReservationDetailsJson} rows={6} placeholder={`{ "categories": ["OBC", "SC", "ST"] }`} help="Detailed reservation criteria." />
                    <JsonArea label="Age Relaxation Rules (JSON)" value={props.ageRelaxationRulesJson} onChange={props.setAgeRelaxationRulesJson} rows={6} placeholder={`[]`} help="Rules for reserved categories." />
                    <JsonArea label="Eligibility Details (JSON)" value={props.eligibilityDetailsJson} onChange={props.setEligibilityDetailsJson} rows={6} placeholder={`{\n  "education": ["10th Pass / Matriculation"],\n  "age": { "min": 18, "max": 27 },\n  "additional": ["Trade skill varies by post"]\n}`} help="Use this instead of burying eligibility inside description." />
                    <JsonArea label="Qualification Details (JSON)" value={props.qualificationDetailsJson} onChange={props.setQualificationDetailsJson} rows={6} placeholder={`[\n  { "post": "JSO", "requirement": "Bachelor's Degree in Statistics" }\n]`} help="Post-wise education details." />
                    <JsonArea label="Physical Standards (JSON)" value={props.physicalStandardsJson} onChange={props.setPhysicalStandardsJson} rows={6} placeholder={`{\n  "applicablePosts": ["Sub-Inspector"],\n  "notes": "Physical standards apply"\n}`} help="Height, weight, and vision standards." />
                </div>
            </div>

            {/* Section 5: Exam & Selection Process */}
            <div className="space-y-4 border-l-4 border-purple-500 pl-4 py-1">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">5. Exam & Selection Process</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Application Mode" value={props.applicationMode} onChange={props.setApplicationMode} placeholder="e.g. Online" />
                    <Field label="Exam Centers" value={props.examCenters} onChange={props.setExamCenters} placeholder="Agra, Patna, Delhi (comma separated)" />
                    <Area label="Selection Stages" value={props.selectionStages} onChange={props.setSelectionStages} placeholder="Tier 1 CBT, Tier 2, Interview, Document Verification" rows={3} />
                    <Area label="Important Instructions" value={props.importantInstructions} onChange={props.setImportantInstructions} placeholder="Upload rules, signature/photo format, official cautions." rows={3} />
                    <JsonArea label="Exam Dates (JSON)" value={props.examDatesJson} onChange={props.setExamDatesJson} rows={6} placeholder={`{\n  "prelims": "",\n  "mains": "",\n  "skillTest": "",\n  "interview": ""\n}`} help="Keep each stage independent so updates stay clean." />
                    <JsonArea label="Exam Pattern (JSON)" value={props.examPatternJson} onChange={props.setExamPatternJson} rows={6} placeholder={`{\n  "tiers": [\n    {\n      "name": "Tier I",\n      "mode": "CBT",\n      "durationMinutes": 60,\n      "totalQuestions": 100,\n      "totalMarks": 200\n    }\n  ]\n}`} help="Structure of exams/sections/syllabus." />
                    <JsonArea label="Skill Tests (JSON)" value={props.skillTestsJson} onChange={props.setSkillTestsJson} rows={6} placeholder={`[\n  {\n    "name": "Data Entry Speed Test",\n    "mandatory": false,\n    "qualifying": true,\n    "durationMinutes": 15\n  }\n]`} help="Typing or physical tests required." />
                    <JsonArea label="Exam Stages (JSON)" value={props.examStagesJson} onChange={props.setExamStagesJson} rows={6} placeholder={`[]`} help="Stage-by-stage date details." />
                    <JsonArea label="Cut Off Marks (JSON)" value={props.cutOffMarksJson} onChange={props.setCutOffMarksJson} rows={6} placeholder={`[\n  { "year": "2025", "category": "General", "marks": 130 }\n]`} help="Previous cut-off marks for this exam." />
                    <JsonArea label="Important Dates (JSON)" value={props.importantDatesJson} onChange={props.setImportantDatesJson} rows={6} placeholder={`[\n  { "label": "Apply Online Starts", "date": "2026-05-21" }\n]`} help="Key timeline dates breakdown." />
                </div>
            </div>

            {/* Section 6: Fees */}
            <div className="space-y-4 border-l-4 border-orange-500 pl-4 py-1">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">6. Application Fees</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Area label="Application Fee" value={props.applicationFee} onChange={props.setApplicationFee} placeholder="General/OBC: Rs.100, SC/ST/PwBD/Women: Nil" rows={3} />
                    <div className="hidden md:block"></div>
                    <JsonArea label="Application Fee (JSON)" value={props.applicationFeeJson} onChange={props.setApplicationFeeJson} rows={6} placeholder={`{\n  "general": 100,\n  "obc": 100,\n  "sc": 0,\n  "st": 0,\n  "pwd": 0,\n  "female": 0\n}`} help="Machine-readable fee map for filters and future badges." />
                    <JsonArea label="Fee Breakdown (JSON)" value={props.feeBreakdownJson} onChange={props.setFeeBreakdownJson} rows={6} placeholder={`{\n  "General": 100,\n  "OBC": 100,\n  "SC": 0\n}`} help="Detailed fee breakup mapping." />
                </div>
            </div>

            {/* Section 7: Documents, Links & Metadata */}
            <div className="space-y-4 border-l-4 border-teal-500 pl-4 py-1">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">7. Links, Documents & Extra</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Official Website" type="url" value={props.officialWebsiteUrl} onChange={props.setOfficialWebsiteUrl} placeholder="https://..." />
                    <Field label="Official Notification URL" type="url" value={props.officialNotificationUrl} onChange={props.setOfficialNotificationUrl} placeholder="https://..." />
                    <Field label="Notification PDF URL" type="url" value={props.notificationPdfUrl} onChange={props.setNotificationPdfUrl} placeholder="https://..." />
                    <Field label="Admit Card URL" type="url" value={props.admitCardUrl} onChange={props.setAdmitCardUrl} placeholder="https://..." />
                    <Field label="Result URL" type="url" value={props.resultUrl} onChange={props.setResultUrl} placeholder="https://..." />
                    <Field label="Answer Key URL" type="url" value={props.answerKeyUrl} onChange={props.setAnswerKeyUrl} placeholder="https://..." />
                    <Field label="Syllabus URL" type="url" value={props.syllabusUrl} onChange={props.setSyllabusUrl} placeholder="https://..." />
                    <Field label="Previous Papers URL" type="url" value={props.previousPapersUrl} onChange={props.setPreviousPapersUrl} placeholder="https://..." />
                    
                    <Area label="Required Documents" value={props.governmentRequiredDocuments} onChange={props.setGovernmentRequiredDocuments} placeholder="Photo ID, Degree certificate, Category certificate" rows={3} />
                    <JsonArea label="Required Documents (JSON)" value={props.governmentRequiredDocumentsJson} onChange={props.setGovernmentRequiredDocumentsJson} rows={6} placeholder={`[\n  { "name": "10th Certificate", "mandatory": true },\n  { "name": "Category Certificate", "mandatory": false }\n]`} help="Structured docs help us show mandatory vs conditional proof properly." />
                    <JsonArea label="Reference Links (JSON)" value={props.referenceLinksJson} onChange={props.setReferenceLinksJson} rows={6} placeholder={`[\n  { "title": "Apply Here", "url": "..." }\n]`} help="Useful external references." />
                    <JsonArea label="Extra Metadata (JSON)" value={props.extraMetadataJson} onChange={props.setExtraMetadataJson} rows={6} placeholder={`{\n  "changesIn2026": [],\n  "vacancyTrend": {}\n}`} help="Any other structured parameters." />
                    <Area label="SEO / Search Tags" value={props.governmentTags} onChange={props.setGovernmentTags} placeholder="Government Job, SSC Vacancy, Graduate Jobs, Central Government" rows={6} help="Comma-separated tags like Government Job, SSC, Graduate Jobs, Central Government." />
                </div>
            </div>
        </div>
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
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm text-foreground"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
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
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm text-foreground"
                placeholder={placeholder}
            />
        </div>
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
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">{label}</label>
            {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-y transition-all shadow-sm text-foreground"
                placeholder={placeholder}
            />
        </div>
    );
}
