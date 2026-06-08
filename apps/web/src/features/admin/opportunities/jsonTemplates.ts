export const JOB_TEMPLATE = `{
  "type": "JOB",
  "title": "Software Engineer",
  "company": "Company Name",
  "companyWebsite": "https://company.com",
  "description": "Role summary...",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["B.Tech / B.E."],
  "allowedSpecializations": ["Computer Science"],
  "allowedPassoutYears": [2024, 2025],
  "requiredSkills": ["react", "node.js"],
  "locations": ["Bangalore"],
  "workMode": "ONSITE",
  "experienceMin": 0,
  "experienceMax": 2,
  "salaryRange": "6-8 LPA",
  "salaryPeriod": "YEARLY",
  "employmentType": "Full Time, Permanent",
  "jobFunction": "Engineering",
  "selectionProcess": "Online Assessment > Technical Interview > HR",
  "notesHighlights": "Training period 3 months. Immediate joiners preferred.",
  "applyLink": "https://company.com/careers/job-id",
  "applicationDetails": {
    "method": "FORM",
    "platform": "Google Forms",
    "estimatedMinutes": 15,
    "requiredItems": ["Resume (PDF)", "GitHub Profile"]
  }
}`;

export const INTERNSHIP_TEMPLATE = `{
  "type": "INTERNSHIP",
  "title": "Frontend Intern",
  "company": "Company Name",
  "companyWebsite": "https://company.com",
  "description": "Internship summary...",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["B.Tech / B.E."],
  "allowedSpecializations": ["Computer Science"],
  "allowedPassoutYears": [2025],
  "requiredSkills": ["html", "css", "javascript"],
  "locations": ["Hyderabad"],
  "workMode": "HYBRID",
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "20-30k/month",
  "salaryPeriod": "MONTHLY",
  "employmentType": "Internship",
  "jobFunction": "Engineering",
  "selectionProcess": "Assignment > Technical Discussion",
  "notesHighlights": "PPO based on performance.",
  "applyLink": "https://company.com/careers/internship-id",
  "applicationDetails": {
    "method": "ASSESSMENT",
    "platform": "HackerRank",
    "estimatedMinutes": 90,
    "requiredItems": ["Resume", "GitHub Profile", "Python Prep"]
  }
}`;

export const WALKIN_TEMPLATE = `{
  "type": "WALKIN",
  "title": "Walk-in Drive - Role",
  "company": "Company Name",
  "companyWebsite": "https://company.com",
  "description": "Walk-in details and eligibility...",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["Any Graduate"],
  "allowedSpecializations": ["Computer Science"],
  "allowedPassoutYears": [],
  "requiredSkills": ["communication skills"],
  "locations": ["Hyderabad"],
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "2 LPA",
  "salaryPeriod": "YEARLY",
  "employmentType": "Full Time, Permanent",
  "jobFunction": "Operations",
  "selectionProcess": "Walk-in Test > Face to Face Interview",
  "notesHighlights": "Bring original IDs and updated resume.",
  "walkInDetails": {
    "dateRange": "9 Feb - 13 Feb",
    "timeRange": "9:30 AM - 12:30 PM",
    "reportingTime": "9:30 AM",
    "venueAddress": "Full venue address...",
    "venueLink": "https://maps.google.com/...",
    "requiredDocuments": [
      "Updated Resume",
      "Photo (last 3 months)",
      "PAN card",
      "Provisional certificate"
    ],
    "contactPerson": "TA Team",
    "contactPhone": ""
  }
}`;

export const GOVERNMENT_JOB_TEMPLATE = `{
  "type": "JOB",
  "title": "SSC CGL 2026 Notification Out — 12256 Vacancies",
  "company": "Staff Selection Commission",
  "companyWebsite": "https://ssc.gov.in",
  "description": "Staff Selection Commission (SSC) has released the SSC CGL Notification 2026 for 12,256 vacancies across 40 Group B and Group C posts in various Central Government Ministries and Departments. SSC CGL is conducted annually for graduate-level candidates.",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["Any Graduate"],
  "allowedSpecializations": [],
  "allowedPassoutYears": [],
  "requiredSkills": [],
  "locations": ["All India"],
  "workMode": "ONSITE",
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "₹25,500 – ₹1,51,100",
  "salaryPeriod": "MONTHLY",
  "employmentType": "Government Service",
  "jobFunction": "Administration / Government",
  "notesHighlights": "One-Time Registration (OTR) mandatory. Sectional timing introduced in Tier 1 & 2.",
  "sourceLink": "https://ssc.gov.in",
  "applyLink": "https://ssc.gov.in",
  "tags": ["Government Job", "SSC", "Central Government", "Graduate Level"],
  "governmentJobDetails": {
    "examName": "SSC CGL",
    "postName": "Assistant Section Officer, Inspector of Income Tax, Auditor, Tax Assistant, Sub-Inspector (CBI)",
    "department": "Central Government",
    "organization": "Staff Selection Commission",
    "recruitingBody": "Staff Selection Commission (SSC)",
    "officialWebsiteUrl": "https://ssc.gov.in",
    "officialNotificationUrl": "https://ssc.gov.in/notice/exams/466",
    "notificationPdfUrl": "https://ssc.gov.in/notice/exams/466",
    "advertisementNumber": "F. No. HQ-C11018/1/2026-C-1",
    "applicationMode": "Online",
    "applicationStatus": "OPEN",
    "governmentLevel": "CENTRAL",
    "jobCategory": ["SSC", "Central Government"],

    "vacancyCount": 12256,
    "vacancyNature": "PERMANENT",
    "vacancyBreakdown": {
      "columns": ["Post Name", "Classification", "Department / Ministry"],
      "rows": [
        ["Assistant Audit Officer (Central Cadre)", "Group B Gazetted", "Indian Audit & Accounts Dept. under C&AG"],
        ["Assistant Section Officer", "Group B", "CSS / IB / Railways / MEA / AFHQ"],
        ["Inspector of Income Tax", "Group C", "CBDT"],
        ["Inspector (Central Excise)", "Group C", "CBIC"],
        ["Assistant Enforcement Officer", "Group C", "Directorate of Enforcement"],
        ["Sub Inspector", "Group C", "CBI"],
        ["Junior Statistical Officer", "Group C", "M/o Statistics & Programme Implementation"],
        ["Auditor", "Group C", "Offices under C&AG / CGDA"],
        ["Tax Assistant", "Group C", "CBDT / CBIC"],
        ["Senior Secretariat Assistant / UDC", "Group C", "Central Govt. Offices"]
      ],
      "notes": "40 posts total. Full list at ssc.gov.in."
    },

    "applicationFee": "₹100 (Women / SC / ST / PwBD / ESM exempted)",
    "feeBreakdown": [
      { "category": "General / OBC", "amount": 100 },
      { "category": "Women / SC / ST / PwBD / ESM", "amount": 0 }
    ],

    "ageMin": 18,
    "ageMax": 32,
    "ageRelaxation": "SC/ST: 5 yrs | OBC: 3 yrs | PwBD: 10 yrs | Ex-Servicemen: 3 yrs",
    "ageRelaxationRules": [
      { "category": "SC / ST", "relaxationYears": 5 },
      { "category": "OBC", "relaxationYears": 3 },
      { "category": "PwBD (General)", "relaxationYears": 10 },
      { "category": "PwBD (OBC)", "relaxationYears": 13 },
      { "category": "PwBD (SC/ST)", "relaxationYears": 15 },
      { "category": "Ex-Servicemen", "relaxation": "3 years after deduction of military service" },
      { "category": "J&K domicile (1980–1989)", "relaxationYears": 5 }
    ],

    "eligibilityDetails": {
      "education": [
        "Bachelor's Degree in any discipline (for most posts).",
        "For JSO: Bachelor's Degree with 60% in Maths in Class 12 OR Statistics at graduation level.",
        "For AAO: Bachelor's Degree. Desirable: CA / CMA / CS / MBA (Finance)."
      ],
      "age": { "min": 18, "max": 32, "notes": "Group C posts: 18–27 years." },
      "nationality": "Indian citizen / Subject of Nepal or Bhutan / Person of Indian origin from specified countries"
    },

    "selectionStages": ["Tier 1 (Qualifying CBT)", "Tier 2 (Merit CBT)", "Answer Key & Objection", "Document Verification"],

    "examStages": [
      {
        "stageNumber": 1,
        "name": "Tier 1 — Qualifying CBT",
        "description": "100 MCQs across 4 sections, 200 marks, 60 minutes with sectional timing (15 min/section). Negative: 0.5 per wrong."
      },
      {
        "stageNumber": 2,
        "name": "Tier 2 — Merit CBT",
        "description": "Paper I (all posts), Paper II (JSO), Paper III (AAO). Negative: 1 mark per wrong. No descriptive paper."
      }
    ],

    "applicationStartDate": "2026-05-21",
    "applicationEndDate": "2026-06-22",
    "examDate": "2026-08-01",
    "admitCardDate": "One week before exam",
    "resultDate": "To Be Announced",
    "importantDates": [
      { "label": "Notification Released",    "date": "2026-05-21" },
      { "label": "Apply Online Starts",      "date": "2026-05-21" },
      { "label": "Last Date to Apply",       "date": "2026-06-22" },
      { "label": "Last Date for Fee",        "date": "2026-06-23" },
      { "label": "Correction Window",        "date": "2026-06-29" },
      { "label": "Tier 1 Exam",             "date": "2026-08-01", "notes": "Aug–Sep 2026 (exact TBA)" },
      { "label": "Tier 2 Exam",             "date": "2026-12-01", "notes": "December 2026 (exact TBA)" },
      { "label": "Answer Key",              "date": "TBA",        "notes": "7–10 days after exam" }
    ],

    "examPattern": {
      "tiers": [
        {
          "name": "Tier 1",
          "mode": "CBT (Online)",
          "durationMinutes": 60,
          "totalQuestions": 100,
          "totalMarks": 200,
          "notes": "15 min sectional timing. Negative: 0.5 per wrong.",
          "subjects": [
            { "name": "General Intelligence & Reasoning", "questions": 25, "marks": 50, "sectionTimeMinutes": 15 },
            { "name": "General Awareness",                "questions": 25, "marks": 50, "sectionTimeMinutes": 15 },
            { "name": "Quantitative Aptitude",            "questions": 25, "marks": 50, "sectionTimeMinutes": 15 },
            { "name": "English Comprehension",            "questions": 25, "marks": 50, "sectionTimeMinutes": 15 }
          ]
        },
        {
          "name": "Tier 2 — Paper I",
          "mode": "CBT (Online)",
          "notes": "Compulsory for all posts. Negative: 1 per wrong.",
          "subjects": [
            { "name": "Mathematical Abilities",             "questions": 30, "marks": 90,  "sectionTimeMinutes": 30 },
            { "name": "Reasoning & General Intelligence",  "questions": 30, "marks": 90,  "sectionTimeMinutes": 30 },
            { "name": "English Language & Comprehension",  "questions": 45, "marks": 135, "sectionTimeMinutes": 40 },
            { "name": "General Awareness",                 "questions": 25, "marks": 75,  "sectionTimeMinutes": 20 },
            { "name": "Computer Knowledge Test",           "questions": 20, "marks": 60,  "sectionTimeMinutes": 15 }
          ]
        }
      ]
    },

    "examCenters": ["All India — 9 SSC Regional Offices"],

    "basicPay": 25500,
    "payLevel": "Level 4 to Level 8 (post-wise)",
    "allowances": ["HRA", "DA", "TA", "Medical", "7th Pay Commission benefits"],

    "requiredDocuments": [
      "10th Certificate (DOB proof)",
      "Graduation Degree / Marksheet",
      "Category Certificate (if applicable)",
      "Scanned Photograph & Signature"
    ],

    "importantInstructions": "OTR mandatory. Sectional timing — practice each section within time limit. Fee via UPI / Net Banking / Debit Card.",

    "officialSourceVerified": true,
    "admitCardUrl": null,
    "resultUrl": null,
    "answerKeyUrl": null,
    "syllabusUrl": "https://ssc.gov.in/SSCFileServer/PortalManagement/UploadedFiles/Syllabus_CGL2024_29042024.pdf",
    "previousPapersUrl": null,

    "cutOffMarks": [
      {
        "year": 2025,
        "tier": "Tier 1",
        "data": [
          { "category": "General", "post": "All Other Posts", "marks": 150.04936 },
          { "category": "EWS",     "post": "All Other Posts", "marks": 143.44441 },
          { "category": "OBC",     "post": "All Other Posts", "marks": 145.93743 },
          { "category": "SC",      "post": "All Other Posts", "marks": 126.68201 },
          { "category": "ST",      "post": "All Other Posts", "marks": 118.16655 },
          { "category": "General", "post": "Finance / AAO",   "marks": 169.67168 },
          { "category": "General", "post": "JSO",             "marks": 168.53975 }
        ]
      }
    ],

    "seoTags": ["SSC CGL 2026", "SSC CGL Notification", "SSC CGL Vacancy", "Staff Selection Commission"],

    "extraMetadata": {
      "examFullForm": "Staff Selection Commission Combined Graduate Level",
      "helpline": "1800 309 3063",
      "otrRequired": true,
      "vacancyTrend": [
        { "year": 2026, "vacancies": 12256 },
        { "year": 2025, "vacancies": 14582 },
        { "year": 2024, "vacancies": 18174 },
        { "year": 2023, "vacancies": 8415 },
        { "year": 2022, "vacancies": 37409 },
        { "year": 2021, "vacancies": 7621 },
        { "year": 2020, "vacancies": 7035 }
      ],
      "postWiseSalary": [
        { "post": "Assistant Audit Officer (AAO)", "payLevel": "Level 8", "payScale": "₹47,600–₹1,51,100", "grossSalary": "₹63,000–₹70,000" },
        { "post": "Assistant Section Officer (CSS)", "payLevel": "Level 7", "payScale": "₹44,900–₹1,42,400", "grossSalary": "₹55,000–₹65,000" },
        { "post": "Inspector (Income Tax / Excise / CBI)", "payLevel": "Level 6", "payScale": "₹35,400–₹1,12,400", "grossSalary": "₹45,000–₹55,000" },
        { "post": "Auditor / Accountant", "payLevel": "Level 5", "payScale": "₹29,200–₹92,300", "grossSalary": "₹40,000–₹50,000" },
        { "post": "Tax Assistant / UDC", "payLevel": "Level 4", "payScale": "₹25,500–₹81,100", "grossSalary": "₹35,000–₹45,000" }
      ],
      "changesIn2026": [
        "AAO posts (Audit Officer & Accounts Officer) included again.",
        "Sectional timing of 15 minutes introduced in Tier 1 (each section).",
        "Tier 2 now has 3 papers: Paper I (all), Paper II (JSO), Paper III (AAO)."
      ],
      "rules": [
        "Study the official syllabus and exam pattern first.",
        "Create a 90-day plan, 6–8 hours daily. Focus on weak subjects.",
        "Solve previous year papers to identify repeating patterns.",
        "Take 2+ full mock tests per week to improve speed and accuracy.",
        "Practice sectional timing — you cannot switch sections during the exam."
      ],
      "examCenterRegions": [
        { "region": "Central (CR)",    "states": "Bihar, Uttar Pradesh",                    "website": "www.ssc-cr.org" },
        { "region": "Eastern (ER)",    "states": "West Bengal, Odisha, Jharkhand, Sikkim",  "website": "www.sscer.org" },
        { "region": "Northern (NR)",   "states": "Delhi, Rajasthan, Uttarakhand",           "website": "www.sscnr.net.in" },
        { "region": "Southern (SR)",   "states": "Andhra Pradesh, Tamil Nadu, Telangana",   "website": "www.sscsr.gov.in" },
        { "region": "Western (WR)",    "states": "Maharashtra, Gujarat, Goa",               "website": "www.sscwr.net" },
        { "region": "KKR",             "states": "Karnataka, Kerala",                       "website": "www.ssckkr.kar.nic.in" },
        { "region": "NWR",             "states": "Punjab, Haryana, Chandigarh, J&K, HP",   "website": "www.sscnwr.org" },
        { "region": "MPR",             "states": "Madhya Pradesh, Chhattisgarh",            "website": "www.sscmpr.org" },
        { "region": "NER",             "states": "Assam, Manipur, Meghalaya, NE States",    "website": "www.sscner.org.in" }
      ]
    }
  }
}`;
