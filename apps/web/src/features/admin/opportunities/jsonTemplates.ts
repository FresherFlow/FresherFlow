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
  "applyLink": "https://company.com/careers/job-id"
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
  "applyLink": "https://company.com/careers/internship-id"
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
  "title": "Constable Tradesman and Driver",
  "company": "Sashastra Seema Bal",
  "companyWebsite": "https://ssb.gov.in",
  "description": "**Overview**\\nSashastra Seema Bal (SSB) has released recruitment for Constable Tradesman and Driver posts across multiple trades.\\n\\n**Special Notes**\\n- Trade-wise eligibility varies by post.\\n- Read the official notification carefully before applying.",
  "allowedDegrees": [],
  "allowedCourses": ["10th Pass / Matriculation"],
  "allowedSpecializations": [],
  "allowedPassoutYears": [],
  "requiredSkills": ["physical fitness", "trade skills"],
  "locations": ["India"],
  "workMode": "ONSITE",
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "Not disclosed",
  "salaryPeriod": "YEARLY",
  "employmentType": "Government Service",
  "jobFunction": "Defence",
  "notesHighlights": "Use only official notification details. Keep trade-wise vacancies and fees structured.",
  "sourceLink": "https://ssb.gov.in",
  "applyLink": "https://ssb.gov.in",
  "tags": ["Government Job", "Central Government", "Defence Jobs India", "10th Pass Govt Job"],
  "governmentJobDetails": {
    "department": "Central Government",
    "organization": "Sashastra Seema Bal",
    "recruitingBody": "Sashastra Seema Bal",
    "officialWebsiteUrl": "https://ssb.gov.in",
    "officialNotificationUrl": "https://ssb.gov.in",
    "advertisementNumber": "SSB/2026/TRADESMAN",
    "postName": "Constable Tradesman and Driver",
    "applicationMode": "Online",
    "applicationModes": ["Online"],
    "vacancyCount": 827,
    "vacancies": [
      {
        "postName": "Constable (Driver)",
        "total": 553
      },
      {
        "postName": "Constable (Tailor)",
        "total": 41
      }
    ],
    "applicationFee": "Refer official fee table",
    "applicationFeeDetails": {
      "general": 100,
      "obc": 100,
      "sc": 0,
      "st": 0,
      "pwd": 0,
      "female": 0
    },
    "ageMin": 18,
    "ageMax": 27,
    "ageRelaxation": "As per government rules",
    "eligibilityDetails": {
      "education": ["10th Pass / Matriculation", "Trade skill / experience varies by post"],
      "age": {
        "min": 18,
        "max": 27,
        "notes": "Some trades are capped at 25 years"
      },
      "additional": ["Heavy vehicle licence required for Driver post"]
    },
    "reservationNotes": "Category-wise relaxation and reservation apply as per official notification.",
    "importantInstructions": "Read the official notice before applying. Keep documents ready in prescribed format.",
    "applicationStartDate": "21 March 2026",
    "applicationEndDate": "20 April 2026",
    "examDate": "Not specified",
    "examDates": {
      "prelims": "",
      "mains": "",
      "skillTest": "",
      "medical": ""
    },
    "admitCardDate": "Before exam",
    "resultDate": "Will be notified",
    "selectionStages": ["Physical Standard Test (PST)", "Physical Efficiency Test (PET)", "Written / Skill Test", "Document Verification", "Medical Test"],
    "requiredDocuments": ["10th Certificate", "Trade Certificate / Experience Proof", "Photo ID", "Category Certificate (if applicable)"],
    "requiredDocumentDetails": [
      { "name": "10th Certificate", "mandatory": true },
      { "name": "Trade Certificate / Experience Proof", "mandatory": true },
      { "name": "Category Certificate", "mandatory": false }
    ],
    "seoTags": ["Government Job", "SSB Recruitment 2026", "Constable Tradesman Vacancy", "10th Pass Govt Job", "Defence Jobs India"]
  }
}`;
