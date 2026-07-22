export const EDUCATION_LEVELS = ['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG'] as const;
export const OPPORTUNITY_TYPES = ['JOB', 'INTERNSHIP', 'WALKIN'] as const;
export const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'] as const;
export const ADMIN_AUTH_TOKEN_KEY = 'ff_admin_auth_token_v1';
export const ADMIN_CACHE_KEY = 'ff_mobile_admin_v1';
export const ADMIN_OPPORTUNITIES_CACHE_KEY = 'ff_admin_mobile_opportunities_cache_v1';
export const ADMIN_OPPORTUNITIES_PAGE_SIZE = 25;

export const INDIAN_CITIES = [
    'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai',
    'Kolkata', 'Ahmedabad', 'Gurugram', 'Noida', 'Chandigarh',
    'Jaipur', 'Kochi', 'Coimbatore', 'Indore', 'Bhopal', 'Lucknow',
    'Visakhapatnam', 'Nagpur', 'Surat', 'Vadodara', 'Mysore',
    'Mangalore', 'Goa', 'Thiruvananthapuram', 'Bhubaneswar',
    'Guwahati', 'Patna', 'Raipur', 'Dehradun'
];

export const COMMON_SKILLS = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL',
    'HTML', 'CSS', 'TypeScript', 'C++', 'C', 'Angular', 'Vue.js',
    'MongoDB', 'PostgreSQL', 'AWS', 'Azure', 'Docker', 'Git',
    'Machine Learning', 'Data Analysis', 'Excel', 'PowerPoint',
    'Communication', 'Teamwork', 'Problem Solving', 'Spring Boot',
    'Django', 'Flask', 'REST API', 'GraphQL', 'Express.js'
];

export const AVAILABILITY_OPTIONS = [
    { value: 'IMMEDIATE', label: 'Within 7 Days' },
    { value: 'DAYS_15', label: '15 Days' },
    { value: 'MONTH_1', label: '30 Days' },
] as const;

export const DIPLOMA_DEGREES = [
    'Diploma in Computer Science', 'Diploma in IT', 'Diploma in Electronics',
    'Diploma in Mechanical', 'Diploma in Civil', 'Diploma in Electrical',
    'Diploma in Artificial Intelligence', 'Other'
];

export const UG_DEGREES = [
    'B.Tech / B.E.', 'B.Sc.', 'BCA', 'BBA', 'B.Com', 'B.A.', 'Other'
];

export const PG_DEGREES = [
    'M.Tech / M.E.', 'M.Sc.', 'MCA', 'MBA', 'M.Com', 'M.A.', 'Other'
];

export const DEGREE_SPECIALIZATIONS: Record<string, string[]> = {
    'B.Tech / B.E.': ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical', 'Mechanical', 'Civil', 'AI & ML', 'Data Science', 'Other'],
    'B.Sc.': ['Computer Science', 'Physics', 'Mathematics', 'Chemistry', 'Information Technology', 'Other'],
    'BCA': ['Software Development', 'Web Applications', 'Database Systems', 'Other'],
    'M.Tech / M.E.': ['Computer Science', 'VLSI Design', 'Structural Engineering', 'Thermo Fluids', 'Cloud Computing', 'Other'],
    'MCA': ['Computer Applications', 'Application Development', 'System Architecture', 'Cloud Tech', 'Other'],
    'MBA': ['Finance', 'Marketing', 'Human Resources', 'Operations', 'Business Analytics', 'Other'],
    'default': ['General', 'Computer Science', 'Business', 'Arts', 'Other']
};

export function getSpecializations(course: string): string[] {
    return DEGREE_SPECIALIZATIONS[course] ?? DEGREE_SPECIALIZATIONS['default'];
}


