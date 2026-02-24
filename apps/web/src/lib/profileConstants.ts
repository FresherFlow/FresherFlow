import {
    ALL_COURSE_OPTIONS,
    ALL_SPECIALIZATION_OPTIONS,
    normalizeCourseName,
    normalizeSpecializationName,
} from '@fresherflow/constants';
export {
    ALL_COURSE_OPTIONS,
    ALL_SPECIALIZATION_OPTIONS,
    normalizeCourseName,
    normalizeSpecializationName,
};

export const EDUCATION_LEVELS = ['DIPLOMA', 'DEGREE', 'PG'];
export const OPPORTUNITY_TYPES = ['JOB', 'INTERNSHIP', 'WALKIN'];
export const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];

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
];

export const DIPLOMA_DEGREES = [
    'Diploma in Computer Science', 'Diploma in IT', 'Diploma in Electronics',
    'Diploma in Mechanical', 'Diploma in Civil', 'Diploma in Electrical',
    'Diploma in Artificial Intelligence', 'Other'
];

export const UG_DEGREES = [
    'B.Tech / B.E.',
    'B.Sc',
    'BCA',
    'BBA',
    'B.Com',
    'B.A',
    'B.Des',
    'B.Ed',
    'B.Pharma',
    'B.Voc',
    'CA',
    'Other',
];

export const PG_DEGREES = [
    'M.Tech / M.E.',
    'M.Sc',
    'MCA',
    'MBA',
    'M.Com',
    'M.A',
    'MS',
    'PhD',
    'Any Postgraduate',
    'Other',
];

export const DEGREE_SPECIALIZATIONS: Record<string, string[]> = {
    'B.Tech / B.E.': ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical & Electronics', 'Mechanical Engineering', 'Civil', 'AI/ML', 'Data Science', 'Cyber Security', 'Other'],
    'B.Sc': ['Computer Science', 'Physics', 'Mathematics', 'Chemistry', 'Information Technology', 'Data Science', 'Other'],
    'BCA': ['Software Development', 'Web Applications', 'Database Systems', 'Other'],
    'M.Tech / M.E.': ['Computer Science', 'VLSI Design', 'Cloud Computing', 'AI/ML', 'Data Science', 'Other'],
    'MCA': ['Computer Applications', 'Application Development', 'System Architecture', 'Cloud Tech', 'Other'],
    'MBA': ['Finance', 'Marketing', 'Human Resources', 'Operations', 'Business Analytics', 'Other'],
    default: [...ALL_SPECIALIZATION_OPTIONS]
};

export function getSpecializations(course: string): string[] {
    const normalizedCourse = normalizeCourseName(course);
    return DEGREE_SPECIALIZATIONS[normalizedCourse] ?? DEGREE_SPECIALIZATIONS.default;
}
