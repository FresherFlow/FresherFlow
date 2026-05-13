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
    applicationModes: string;
    setApplicationModes: (value: string) => void;
    vacancyCount: string;
    setVacancyCount: (value: string) => void;
    vacanciesJson: string;
    setVacanciesJson: (value: string) => void;
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
}

export function GovernmentJobSection(props: GovernmentJobSectionProps) {
    return (
        <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                <BuildingOffice2Icon className="w-4 h-4 text-muted-foreground" />
                Government Job Details
            </h3>

            <p className="text-xs text-muted-foreground">
                Use only official notice data here. These fields improve trust, structured SEO, and future filters for government listings.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Department" value={props.department} onChange={props.setDepartment} placeholder="e.g. Central Government" />
                <Field label="Organization" value={props.organization} onChange={props.setOrganization} placeholder="e.g. Staff Selection Commission" />
                <Field label="Recruiting Body" value={props.recruitingBody} onChange={props.setRecruitingBody} placeholder="e.g. SSC / IBPS / RRB" />
                <Field label="Official Website" type="url" value={props.officialWebsiteUrl} onChange={props.setOfficialWebsiteUrl} placeholder="https://..." />
                <Field label="Official Notification URL" type="url" value={props.officialNotificationUrl} onChange={props.setOfficialNotificationUrl} placeholder="https://..." />
                <Field label="Advertisement Number" value={props.advertisementNumber} onChange={props.setAdvertisementNumber} placeholder="e.g. SSC/2026/01" />
                <Field label="Post Name" value={props.postName} onChange={props.setPostName} placeholder="Official post name" />
                <Field label="Application Mode" value={props.applicationMode} onChange={props.setApplicationMode} placeholder="e.g. Online" />
                <Field label="Application Modes" value={props.applicationModes} onChange={props.setApplicationModes} placeholder="Online, Offline, Walk-in" />
                <Field label="Vacancy Count" type="number" value={props.vacancyCount} onChange={props.setVacancyCount} placeholder="e.g. 250" />
                <Field label="Application Start" value={props.applicationStartDate} onChange={props.setApplicationStartDate} placeholder="e.g. 27 March 2026" />
                <Field label="Application End" value={props.applicationEndDate} onChange={props.setApplicationEndDate} placeholder="e.g. 25 April 2026" />
                <Field label="Exam Date" value={props.examDate} onChange={props.setExamDate} placeholder="e.g. 12 June 2026 / To be announced" />
                <Field label="Admit Card Date" value={props.admitCardDate} onChange={props.setAdmitCardDate} placeholder="e.g. Before exam" />
                <Field label="Result Date" value={props.resultDate} onChange={props.setResultDate} placeholder="e.g. Will be notified" />
                <Field label="Age Min" type="number" value={props.ageMin} onChange={props.setAgeMin} placeholder="18" />
                <Field label="Age Max" type="number" value={props.ageMax} onChange={props.setAgeMax} placeholder="27" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Area label="Application Fee" value={props.applicationFee} onChange={props.setApplicationFee} placeholder="General/OBC: Rs.100, SC/ST/PwBD/Women: Nil" rows={3} />
                <JsonArea label="Application Fee (JSON)" value={props.applicationFeeJson} onChange={props.setApplicationFeeJson} rows={6} placeholder={`{\n  "general": 100,\n  "obc": 100,\n  "sc": 0,\n  "st": 0,\n  "pwd": 0,\n  "female": 0\n}`} help="Machine-readable fee map for filters and future badges." />
                <Area label="Age Relaxation" value={props.ageRelaxation} onChange={props.setAgeRelaxation} placeholder="As per official rules for reserved categories." rows={3} />
                <JsonArea label="Eligibility Details (JSON)" value={props.eligibilityDetailsJson} onChange={props.setEligibilityDetailsJson} rows={7} placeholder={`{\n  "education": ["10th Pass / Matriculation"],\n  "age": { "min": 18, "max": 27 },\n  "additional": ["Trade skill varies by post"]\n}`} help="Use this instead of burying eligibility inside description." />
                <Area label="Reservation Notes" value={props.reservationNotes} onChange={props.setReservationNotes} placeholder="Category-wise reservation / domicile notes / women reservation." rows={3} />
                <Area label="Important Instructions" value={props.importantInstructions} onChange={props.setImportantInstructions} placeholder="Upload rules, signature/photo format, official cautions." rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Area label="Selection Stages" value={props.selectionStages} onChange={props.setSelectionStages} placeholder="Tier 1 CBT, Tier 2, Interview, Document Verification" rows={3} />
                <Area label="Required Documents" value={props.governmentRequiredDocuments} onChange={props.setGovernmentRequiredDocuments} placeholder="Photo ID, Degree certificate, Category certificate" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <JsonArea label="Vacancies (JSON)" value={props.vacanciesJson} onChange={props.setVacanciesJson} rows={9} placeholder={`[\n  {\n    "postName": "Constable (Driver)",\n    "total": 553,\n    "categoryBreakup": { "general": 230, "obc": 149, "sc": 83, "st": 41 }\n  }\n]`} help="Post-wise vacancy breakdown is the real govt-job structure." />
                <JsonArea label="Exam Dates (JSON)" value={props.examDatesJson} onChange={props.setExamDatesJson} rows={8} placeholder={`{\n  "prelims": "",\n  "mains": "",\n  "skillTest": "",\n  "interview": ""\n}`} help="Keep each stage independent so updates stay clean." />
            </div>

            <JsonArea label="Required Documents (JSON)" value={props.governmentRequiredDocumentsJson} onChange={props.setGovernmentRequiredDocumentsJson} rows={8} placeholder={`[\n  { "name": "10th Certificate", "mandatory": true },\n  { "name": "Category Certificate", "mandatory": false }\n]`} help="Structured docs help us show mandatory vs conditional proof properly." />

            <Area
                label="SEO / Search Tags"
                help="Comma-separated tags like Government Job, SSC, Graduate Jobs, Central Government."
                value={props.governmentTags}
                onChange={props.setGovernmentTags}
                placeholder="Government Job, SSC Vacancy, Graduate Jobs, Central Government"
                rows={3}
            />
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
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
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
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-y transition-all shadow-sm"
                placeholder={placeholder}
            />
        </div>
    );
}
