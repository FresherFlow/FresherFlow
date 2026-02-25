const COURSE_CANONICAL_MAP: Record<string, string> = {
    btech: 'B.Tech / B.E.',
    be: 'B.Tech / B.E.',
    bee: 'B.Tech / B.E.',
    bebtech: 'B.Tech / B.E.',
    btechbe: 'B.Tech / B.E.',
    bebtechcsit: 'B.Tech / B.E.',
    btechbecsit: 'B.Tech / B.E.',
    btechbemba: 'B.Tech / B.E.',
    bsc: 'B.Sc',
    bscit: 'B.Sc',
    bsccsit: 'B.Sc',
    bscitcs: 'B.Sc',
    bca: 'BCA',
    bbca: 'BCA',
    bcca: 'BCA',
    bba: 'BBA',
    bbm: 'BBA',
    bms: 'BBA',
    bcom: 'B.Com',
    ba: 'B.A',
    mtech: 'M.Tech / M.E.',
    me: 'M.Tech / M.E.',
    msc: 'M.Sc',
    mca: 'MCA',
    mcom: 'M.Com',
    mbafinance: 'MBA',
    mba: 'MBA',
    maenglish: 'M.A',
    msccomputers: 'M.Sc',
    bfa: 'B.Des',
    bs: 'B.Sc',
    bvoc: 'B.Voc',
    cse: 'Computer Science',
    csbs: 'Computer Science',
    computerscienceengineering: 'Computer Science',
    computerengineering: 'Computer Science',
    communicationengineering: 'Electronics and Communication Engineering',
    electronicsandcommunicationengineering: 'Electronics and Communication Engineering',
    electronicsengineering: 'Electronics',
    electricalandelectronicsengineering: 'Electrical Engineering',
    cybersecurity: 'Cyber Security',
    aiml: 'Artificial Intelligence',
    ai: 'Artificial Intelligence',
    dataengineering: 'Data Science',
    bigdataanalytics: 'Data Science',
    blockchain: 'Computer Science',
    cloudcomputing: 'Computer Science',
    iot: 'Computer Science',
    webdevelopment: 'Computer Science',
    computerbackgroundbranches: 'Computer Science',
    datamanagement: 'Data Science',
    machinelearning: 'Artificial Intelligence',
    robotics: 'Mechanical Engineering',
    telecommunications: 'Electronics and Communication Engineering',
    instrumentationengineering: 'Electrical Engineering',
    informationmanagement: 'Information Technology',
    informationsystems: 'Information Technology',
    it: 'Information Technology',
    businessanalytics: 'Business',
    businessintelligence: 'Business',
    management: 'Business',
    arts: 'B.A',
    ma: 'M.A',
    mcm: 'MCA',
    pharma: 'B.Pharma',
    diplomaingraphicdesign: 'B.Des',
    electrical: 'Electrical Engineering',
    bebtechmba: 'B.Tech / B.E.',
    circuitbranches: 'Engineering',
    graduatecsitfinancerelated: 'Any Graduate',
    charteredaccountancy: 'CA',
    charteredaccountantca: 'CA',
    postgraduate: 'Any Postgraduate',
    allcourses: 'Any Graduate',
    allstreams: 'Any Graduate',
    alliedstreams: 'Any Graduate',
    relatedfield: 'Any Graduate',
    relatedfields: 'Any Graduate',
    relatedtechnicalfield: 'Any Graduate',
    relatedtechnicalfields: 'Any Graduate',
    relatedtechnicaldiscipline: 'Any Graduate',
    relatedengineeringfields: 'Any Graduate',
    equivalenttechnicalfields: 'Any Graduate',
    technologyfields: 'Any Graduate',
    engineeringgraduate: 'Any Graduate',
    anygraduate: 'Any Graduate',
    graduate: 'Any Graduate',
};

const SPECIALIZATION_CANONICAL_MAP: Record<string, string> = {
    cse: 'Computer Science',
    computerscienceengineering: 'Computer Science',
    computerengineering: 'Computer Science',
    computerapplications: 'Computer Applications',
    it: 'Information Technology',
    informationsystems: 'Information Technology',
    informationscience: 'Information Technology',
    informationmanagement: 'Information Technology',
    ece: 'Electronics & Communication',
    electronicsandcommunication: 'Electronics & Communication',
    electronicsengineering: 'Electronics',
    eee: 'Electrical & Electronics',
    eie: 'Electrical & Electronics',
    electricalengineering: 'Electrical & Electronics',
    cybersecurity: 'Cyber Security',
    relatedengineeringfields: 'General',
    relatedengineeringbranches: 'General',
    relatedtechnicalfields: 'General',
    relateditfields: 'General',
    relatedfield: 'General',
    relatedfields: 'General',
    alliedbranches: 'General',
    anyspecialization: 'General',
    any: 'General',
    otherbranches: 'General',
    accounting: 'Finance',
    accountingreporting: 'Finance',
    charteredaccountancy: 'Finance',
    internalaudit: 'Finance',
    riskmanagement: 'Finance',
    businessintelligence: 'Business Analytics',
    management: 'Business Administration',
    operationsresearch: 'Operations',
    visualcommunication: 'Design',
    finearts: 'Design',
    hardwareengineering: 'Computer Science',
    materialsengineering: 'Mechanical Engineering',
    aerospaceengineering: 'Mechanical Engineering',
    aiml: 'AI/ML',
    artificialintelligence: 'AI/ML',
    machinelearning: 'AI/ML',
};

const toToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

export const ALL_COURSE_OPTIONS = [
    // Keep this list as "course/degree level" only.
    // Subject/branch details must be selected via specializations.
    'Diploma',
    'B.Tech / B.E.', 'B.Sc', 'BCA', 'BBA', 'B.Com', 'B.A',
    'M.Tech / M.E.', 'M.Sc', 'MCA', 'MBA', 'M.Com', 'M.A',
    'MS', 'CA', 'B.Des', 'B.Ed', 'B.Pharma', 'B.Voc', 'PhD',
    'Any Graduate', 'Any Postgraduate', '12th Pass', 'HSC', 'Other'
] as const;

export const ALL_SPECIALIZATION_OPTIONS = [
    'Computer Science', 'Information Technology', 'Electronics & Communication',
    'Electronics', 'Electrical & Electronics', 'Mechanical Engineering', 'Civil',
    'AI/ML', 'Data Science', 'Data Analytics', 'Cyber Security', 'Software Engineering',
    'Computer Applications', 'Business Administration', 'Business Analytics',
    'Finance', 'Commerce', 'Marketing', 'Human Resources', 'Operations',
    'Mathematics', 'Physics', 'Chemistry', 'Economics', 'Design',
    'Graphic Design', 'VLSI Design', 'Statistics', 'General', 'Other',
    'Accounting', 'Accounting & Reporting', 'Risk Management', 'Internal Audit',
    'Information Management', 'Information Systems', 'Technology Management',
    'Operations Research', 'Fine Arts', 'Visual Communication'
] as const;

export function normalizeCourseName(value: string | null | undefined): string {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    return COURSE_CANONICAL_MAP[toToken(trimmed)] || trimmed;
}

export function normalizeSpecializationName(value: string | null | undefined): string {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    return SPECIALIZATION_CANONICAL_MAP[toToken(trimmed)] || trimmed;
}

export function normalizeCourseArray(values: Array<string | null | undefined>): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    for (const value of values) {
        const normalized = normalizeCourseName(value);
        if (!normalized) continue;
        const key = toToken(normalized);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        output.push(normalized);
    }
    return output;
}

export function normalizeSpecializationArray(values: Array<string | null | undefined>): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    for (const value of values) {
        const normalized = normalizeSpecializationName(value);
        if (!normalized) continue;
        const key = toToken(normalized);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        output.push(normalized);
    }
    return output;
}
