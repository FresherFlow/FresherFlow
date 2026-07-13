import DOMPurify from 'isomorphic-dompurify';

interface CompanyStats {
    activeJobsCount: number;
    locations: string[];
    skills: string[];
    roles: string[];
}

export const TIER_A_SLUGS = new Set([
    'deloitte', 'accenture', 'tcs', 'tata-consultancy-services', 'infosys', 'cognizant', 'capgemini',
    'wipro', 'ibm', 'amazon', 'microsoft', 'google', 'oracle', 'salesforce', 'cisco', 'hcltech',
    'hcl-technologies', 'tech-mahindra', 'ey', 'ernst-young', 'pwc', 'kpmg', 'ltts',
    'l-t-technology-services', 'mindtree', 'mphasis', 'coforge', 'persistent-systems', 'ust-global',
    'virtusa', 'hexaware', 'zoho', 'freshworks', 'swiggy', 'zomato', 'paytm', 'phonepe', 'ola',
    'jio', 'reliance-jio', 'airtel', 'bharti-airtel', 'barclays', 'hsbc', 'morgan-stanley',
    'jpmorgan-chase', 'jpmorgan', 'goldman-sachs', 'adobe', 'intel', 'nvidia', 'amd'
]);

const TIER_A_PROFILES: Record<string, string> = {
    'deloitte': `
        <h3>About Deloitte India</h3>
        <p>Deloitte is a leading global provider of audit and assurance, consulting, financial advisory, risk advisory, tax, and related services. In India, Deloitte is one of the largest employers of technology and consulting graduates. The firm hires heavily from campus drives and off-campus pools for roles in Deloitte Consulting, Deloitte USI (U.S. India Offices), and Risk Advisory branches.</p>
        
        <h3>Fresher Hiring Process</h3>
        <p>The selection process at Deloitte is structured and generally comprises three key stages:</p>
        <ol>
            <li><strong>Online Assessment:</strong> Focused on quantitative aptitude, logical reasoning, verbal ability, and coding/pseudo-code logic.</li>
            <li><strong>Group Discussion / Case Study:</strong> Candidates are evaluated on communication, problem-solving, and team collaboration.</li>
            <li><strong>Technical & HR Interview:</strong> A comprehensive dialogue reviewing database concepts, data structures, and behavioral fit.</li>
        </ol>

        <h3>Eligibility & Graduation Batches</h3>
        <p>Deloitte typically recruits candidates from BE / BTech (CS, IT, ECE, EEE), MCA, and MSc streams. They regularly publish off-campus opportunities for recent graduation years including the 2025 and 2026 batches. A minimum aggregate score of 60% or 6.5 CGPA is standard, with no active backlogs allowed during onboarding.</p>

        <h3>Typical Roles and Compensation</h3>
        <p>Freshers usually join as <strong>Associate Analyst</strong> or <strong>Business Analyst</strong>. Standard packages for Associate Analysts start around ₹3.6 LPA - ₹4.5 LPA, while specialized Consulting or Analyst roles range between ₹6.5 LPA and ₹8.5 LPA. Deloitte offers robust career progression with annual appraisals and professional certification supports.</p>

        <h3>Skills and Technologies Used</h3>
        <p>Deloitte projects span across Cloud (AWS, Azure, GCP), Enterprise Systems (SAP, Salesforce), Software Development (Java, Python, Javascript), and Data Analytics (SQL, Tableau, PowerBI). Candidates with strong database fundamentals and object-oriented programming exposure hold a distinct advantage.</p>
    `,
    'accenture': `
        <h3>About Accenture India</h3>
        <p>Accenture is a global professional services company with leading capabilities in digital, cloud, and security. Combining unmatched experience and specialized skills across more than 40 industries, Accenture is India's largest IT recruiter, housing massive delivery centers in Bangalore, Hyderabad, Pune, Chennai, and Delhi NCR.</p>
        
        <h3>Fresher Hiring Process</h3>
        <p>Accenture utilizes a standardized evaluation platform consisting of the following rounds:</p>
        <ol>
            <li><strong>Cognitive and Technical Assessment:</strong> Assesses analytical reasoning, English ability, pseudo-code, MS Office, and network security basics.</li>
            <li><strong>Coding Assessment:</strong> A hands-on round requiring candidates to solve 2 coding problems in languages like C, C++, Java, Python, or JavaScript.</li>
            <li><strong>Communication Assessment:</strong> Automated test checking sentence mastery, vocabulary, and pronunciation.</li>
            <li><strong>Technical & HR Interview:</strong> Final interview evaluating project experience, basic computer science concepts, and cultural alignment.</li>
        </ol>

        <h3>Eligibility & Graduation Batches</h3>
        <p>Accenture hiring is highly popular among engineering graduates (BE / BTech all streams), MCA, and MSc (CS/IT) candidates. They consistently run drives for the 2025 and 2026 batches. Candidates must maintain a clear academic record without active backlogs at the time of final selection.</p>

        <h3>Typical Roles and Compensation</h3>
        <p>Freshers are recruited into two primary entry-level profiles:</p>
        <ul>
            <li><strong>Associate Software Engineer (ASE):</strong> Standard CTC is ₹4.5 LPA.</li>
            <li><strong>Advanced Associate Software Engineer (AASE):</strong> Premium CTC ranging between ₹6.5 LPA and ₹7.0 LPA.</li>
        </ul>

        <h3>Skills and Technologies Used</h3>
        <p>Accenture's development projects leverage Java, Python, Angular, React, Node.js, and Salesforce. They place a strong emphasis on cloud technologies (AWS, Azure) and DevOps methodologies. Freshers receive extensive initial learning program (ILP) training upon joining.</p>
    `,
    'tcs': `
        <h3>About Tata Consultancy Services (TCS)</h3>
        <p>Tata Consultancy Services (TCS) is a purpose-led, transformational IT services, consulting, and business solutions organization. As one of the largest multinational employers in India, TCS drives massive economic value and offers highly stable career paths for engineering and science graduates nationwide.</p>
        
        <h3>Fresher Hiring Process</h3>
        <p>TCS recruits freshers primarily through the National Qualifier Test (NQT) framework, consisting of:</p>
        <ol>
            <li><strong>TCS NQT Assessment:</strong> Covers numerical ability, verbal ability, reasoning ability, and hands-on coding (2 problems of moderate difficulty).</li>
            <li><strong>Technical Interview:</strong> Deep dive into core programming languages, DBMS, OS, and final-year academic projects.</li>
            <li><strong>Managerial & HR Interview:</strong> Focuses on willingness to relocate, communication skills, and compatibility with Tata values.</li>
        </ol>

        <h3>Eligibility & Graduation Batches</h3>
        <p>Open to BE, BTech, ME, MTech, MCA, and MSc (CS/IT) streams. TCS is particularly famous for hiring large volumes of graduates from the 2025 and 2026 passout years. Minimum academic threshold is 60% throughout Class X, XII, and graduation.</p>

        <h3>Typical Roles and Compensation</h3>
        <p>TCS has three core fresher hiring categories based on NQT performance:</p>
        <ul>
            <li><strong>TCS Ninja:</strong> General entry-level role offering ₹3.36 LPA.</li>
            <li><strong>TCS Digital:</strong> Mid-tier development role focusing on next-gen tech, offering ₹7.0 LPA.</li>
            <li><strong>TCS Prime:</strong> Premium engineering role focusing on advanced systems and R&D, offering ₹9.0 LPA.</li>
        </ul>

        <h3>Skills and Technologies Used</h3>
        <p>TCS operates across a massive tech catalog including Java, C#, Python, SQL, Cloud Computing, SAP, and Embedded Systems. Strong logical programming foundation is the main requirement for freshers looking to clear the NQT coding rounds.</p>
    `,
    'infosys': `
        <h3>About Infosys</h3>
        <p>Infosys is a global leader in next-generation digital services and consulting. Known for its world-class corporate training center in Mysore, Infosys recruits thousands of engineering and science graduates annually, transforming them into skilled tech consultants and software engineers.</p>
        
        <h3>Fresher Hiring Process</h3>
        <p>Infosys hiring rounds typically involve:</p>
        <ol>
            <li><strong>Online Assessment:</strong> Covers logical and analytical reasoning, quantitative aptitude, verbal ability, and pseudocode/puzzle-solving questions.</li>
            <li><strong>Technical Interview:</strong> Evaluates basic coding skills, OOPs concepts, SQL queries, and project architecture.</li>
            <li><strong>HR Interview:</strong> Checks communication, adaptability, and behavioral scenarios.</li>
        </ol>

        <h3>Eligibility & Graduation Batches</h3>
        <p>Infosys welcomes graduates from BE, BTech, ME, MTech, MCA, and MSc (CS/IT/Mathematics) streams. They conduct active campus and off-campus drives for 2025 and 2026 batches. A minimum CGPA of 6.0 or 60% aggregate is usually required.</p>

        <h3>Typical Roles and Compensation</h3>
        <p>Infosys offers three distinct entry-level career bands:</p>
        <ul>
            <li><strong>System Engineer (SE):</strong> Standard package of ₹3.6 LPA.</li>
            <li><strong>Digital Specialist Engineer (DSE):</strong> Focused on full-stack development, cloud, and big data, offering ₹6.25 LPA.</li>
            <li><strong>Specialist Programmer (SP):</strong> A high-end coding profile (Power Programmer) offering ₹9.5 LPA.</li>
        </ul>

        <h3>Skills and Technologies Used</h3>
        <p>Infosys development teams work extensively with Java, Python, .NET, React, Angular, AWS, Azure, and Salesforce. Freshers undergo a mandatory 3-to-4 month training program covering full-stack concepts, databases, and soft skills before getting allocated to live projects.</p>
    `,
    'cognizant': `
        <h3>About Cognizant India</h3>
        <p>Cognizant is a leading professional services company that transforms clients' business, operating, and technology models for the digital era. With a massive presence across India, Cognizant provides freshers with immediate exposure to global delivery pipelines and modern software engineering practices.</p>
        
        <h3>Fresher Hiring Process</h3>
        <p>Cognizant's entry-level recruitment workflow generally features:</p>
        <ol>
            <li><strong>Aptitude & Technical MCQ Test:</strong> Evaluates quantitative aptitude, logical reasoning, and programming fundamentals (debugging and dry-runs).</li>
            <li><strong>Coding Test:</strong> Practical coding challenges verifying algorithmic competence.</li>
            <li><strong>Technical & HR Interview:</strong> Verifies core subjects like DBMS, Data Structures, OOPs, and review of academic projects.</li>
        </ol>

        <h3>Eligibility & Graduation Batches</h3>
        <p>Open to BE, BTech (all engineering branches), MCA, and MSc (CS/IT) graduates. Cognizant routinely opens off-campus applications for 2025 and 2026 passout candidates. A 60% aggregate score throughout the academic career is expected.</p>

        <h3>Typical Roles and Compensation</h3>
        <p>Freshers usually join through two core paths:</p>
        <ul>
            <li><strong>Programmer Analyst Trainee (PAT):</strong> Standard tech training track with a CTC of ₹4.01 LPA.</li>
            <li><strong>GenC Developer / GenC Elevate:</strong> Specialized tracks focusing on full-stack and cloud skills, offering ₹4.5 LPA - ₹6.5 LPA.</li>
        </ul>

        <h3>Skills and Technologies Used</h3>
        <p>Cognizant's core technology suites consist of Java, C#, Spring Boot, React, Node.js, SQL databases, and Salesforce. A strong understanding of software development lifecycles (SDLC) and agile methodologies is highly valued.</p>
    `,
    'capgemini': `
        <h3>About Capgemini India</h3>
        <p>Capgemini is a global leader in partnering with companies to transform and manage their business by harnessing the power of technology. Headquartered in Paris, Capgemini has a massive delivery footprint in India (over 150,000 employees), hiring freshers for high-impact consulting and technology integration projects.</p>
        
        <h3>Fresher Hiring Process</h3>
        <p>Capgemini recruits freshers through a structured multi-round assessment:</p>
        <ol>
            <li><strong>Pseudocode Test:</strong> Checks basic programming knowledge, code outputs, and logic flow.</li>
            <li><strong>English Communication Test:</strong> Assessment of grammar, comprehension, and vocabulary.</li>
            <li><strong>Game-Based Aptitude:</strong> Unique behavioral and cognitive puzzles mapping problem-solving speed.</li>
            <li><strong>Technical & HR Interview:</strong> Panel review covering programming basics (Java/C++/Python), SQL, and behavioral fitment.</li>
        </ol>

        <h3>Eligibility & Graduation Batches</h3>
        <p>Eligible streams include BE, BTech, MCA, and MSc (CS/IT). Capgemini regularly targets the 2025 and 2026 graduating cohorts with active off-campus referral drives. A minimum of 55% or 60% in graduation with no active backlogs is standard.</p>

        <h3>Typical Roles and Compensation</h3>
        <p>Entry-level graduates join as <strong>Analyst</strong> or <strong>Senior Analyst</strong>. The Analyst role carries a CTC of ₹4.0 LPA, while Senior Analyst roles focused on specialized cloud, analytics, or cyber-security portfolios offer ₹6.8 LPA - ₹7.5 LPA.</p>

        <h3>Skills and Technologies Used</h3>
        <p>Capgemini utilizes Java, Python, Javascript, Angular, AWS, Azure, Salesforce, and SAP. They offer structured training academies that specialize freshers in specific ERP, web development, or cloud security roles post-onboarding.</p>
    `
};

export function getCompanyDescription(slug: string, name: string, stats: CompanyStats): string {
    const cleanSlug = slug.toLowerCase();
    
    // Tier A Customized Rich Profile
    if (TIER_A_PROFILES[cleanSlug]) {
        return TIER_A_PROFILES[cleanSlug];
    }

    // Programmatically generate a rich description (300-500 words) for other companies (Tier B)
    const cleanName = DOMPurify.sanitize(name, { ALLOWED_TAGS: [] });

    const locList = stats.locations.length > 0 
        ? DOMPurify.sanitize(stats.locations.slice(0, 4).join(', '), { ALLOWED_TAGS: [] }) 
        : 'various technology hubs across India';
    
    const skillList = stats.skills.length > 0 
        ? DOMPurify.sanitize(stats.skills.slice(0, 5).join(', '), { ALLOWED_TAGS: [] }) 
        : 'software engineering and logical reasoning skills';

    const roleList = stats.roles.length > 0 
        ? DOMPurify.sanitize(stats.roles.slice(0, 3).join(', '), { ALLOWED_TAGS: [] }) 
        : 'Associate, Developer, and Intern';

    const countText = stats.activeJobsCount === 1 
        ? '1 active opportunity' 
        : `${stats.activeJobsCount} active opportunities`;

    return `
        <h3>About ${cleanName}</h3>
        <p><strong>${cleanName}</strong> is a prominent enterprise actively hiring freshers and entry-level professionals. Currently, ${cleanName} has <strong>${countText}</strong> listed on FresherFlow, catering to candidates looking to kickstart their career in software development, engineering, or technology operations. Key vacancies regularly include roles like <em>${roleList}</em>.</p>
        
        <h3>Hiring Locations & Workplace Model</h3>
        <p>Opportunities at ${cleanName} are distributed across major tech hubs, primarily recruiting candidates for roles in <strong>${locList}</strong>. Depending on the team and business unit requirements, they offer remote, hybrid, or office-based employment models. Freshers are encouraged to refer to individual job listings for specific details regarding training schedules and branch assignments.</p>

        <h3>Expected Skills & Qualifications</h3>
        <p>Recruiters at ${cleanName} typically look for foundational expertise in <strong>${skillList}</strong>. Candidates are expected to possess strong communication skills, basic programming logic, and problem-solving capabilities. Common eligible degrees include BE, BTech, BCA, MCA, BSc CS, or related disciplines.</p>

        <h3>Recent Opportunities & Applying</h3>
        <p>Active postings are verified and open to recent graduation batches, including 2025 and 2026 graduates. Every apply link directs candidates to the official careers site of ${cleanName}. Be sure to verify all requirements, aggregate percentage cutoffs, and bond commitments before submitting your application to ensure maximum success.</p>
    `;
}
