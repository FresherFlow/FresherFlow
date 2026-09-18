# Listing JSON Templates

Use these payloads in admin **Paste JSON payload**. All listed fields are auto-filled, including dates.

## Important Field Meaning (Use this exactly)
- `allowedDegrees`: qualification level bucket only (`TENTH`, `INTER`, `DIPLOMA`, `DEGREE`, `PG`)
- `allowedCourses`: actual degree/specialization names (examples: `B.Tech`, `B.Sc`, `Computer Science`, `Mechanical`)
- `allowedSpecializations`: branch/specialization names (examples: `Computer Science`, `Information Technology`, `Mechanical`)
- `allowedPassoutYears`: exact eligible years (example: `[2023, 2024, 2025]`)
- `experienceMin` / `experienceMax`: separate eligibility rule, not education

### Example mapping
- Education level: `DEGREE` (or `TENTH`, `INTER`, `DIPLOMA`, `PG` as applicable)
- Course/degree: `B.Tech`
- Specialization: `Computer Science`

### Application Details Format (JSON Field)

For private opportunities, specify this block to configure application complexity:
- `method`: `'DIRECT'` (direct apply link), `'FORM'` (Google forms/portal forms), or `'ASSESSMENT'` (coding/timed assessment)
- `platform`: Name of the platform (e.g. `Google Forms`, `HackerRank`, `Mahindra Portal`)
- `estimatedMinutes`: Estimated minutes to fill/complete (integer)
- `requiredItems`: Checklist of items the candidate should prepare (e.g. `["Resume", "10th Marksheet", "GitHub"]`)

> [!IMPORTANT]
> **Direct Apply Rule**: If the application is a direct redirect (i.e. we just send the candidate to the external apply link via `applyLink` and do not collect form data ourselves), you **MUST set `applicationDetails` to `null`**. Do not provide an object with empty strings.
> 
> ```json
> "applicationDetails": null
> ```

Example of Google Form / Portal Form integration:
```json
"applicationDetails": {
  "method": "FORM",
  "platform": "Google Forms",
  "estimatedMinutes": 15,
  "requiredItems": ["Resume", "GitHub", "Portfolio"]
}
```


## Supported Date/Time Formats
- `expiresAt`: ISO local datetime (`YYYY-MM-DDTHH:mm`) or ISO timestamp
- `startDate`, `endDate`: `YYYY-MM-DD`
- `startTime`, `endTime`: `HH:mm` (24-hour)
- `walkInDetails.dates`: array of dates (`["YYYY-MM-DD", "YYYY-MM-DD"]`)

## Description Formatting
- `description` supports normal new lines.
- If you are writing JSON manually, use `\n` inside the string to create a new line.
- Do not use `/n`; that will be treated as normal text. Use `\n`.
- Admin text area line breaks also work when typing normally.
- Use `**Heading**` for bold section headings.
- Use `**bold text**` for inline bold text.
- Use lines starting with `- ` to create bullet points.
- Short lines ending with `:` are also rendered like headings.
- Raw HTML is not required; plain text formatting is enough.
- 
### Description example

```json
{
  "description": "**Responsibilities**\n- Build frontend features\n- Work with APIs\n\n**Requirements**\n- React\n- TypeScript\n\nNote: Immediate joiners preferred."
}
```

### Description tips
- Keep section headings short, for example: `**Responsibilities**`, `**Requirements**`, `**Eligibility**`.
- Put each bullet on its own line.
- Leave one empty line between sections for better readability.
- If you paste from another source, quickly check that line breaks are still preserved.
- `selectionProcess`, `notesHighlights`, and similar long-text fields are best written with short readable sections too.

## Job (Full-time)

```json
{
  "type": "JOB",
  "title": "",
  "company": "",
  "companyWebsite": "",
  "description": "",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["B.Tech", ""],
  "allowedSpecializations": ["Computer Science"],
  "allowedPassoutYears": [],
  "requiredSkills": [],
  "locations": [],
  "workMode": "ONSITE",
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "",
  "salaryAmount": "",
  "salaryPeriod": "YEARLY",
  "employmentType": "",
  "jobFunction": "",
  "incentives": "",
  "selectionProcess": "",
  "notesHighlights": "",
  "applyLink": "",
  "customSlug": "",
  "expiresAt": "",
  "applicationDetails": null
}
```

## Internship

```json
{
  "type": "INTERNSHIP",
  "title": "",
  "company": "",
  "companyWebsite": "",
  "description": "",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["B.Tech", ""],
  "allowedSpecializations": ["Computer Science"],
  "allowedPassoutYears": [],
  "requiredSkills": [],
  "locations": [],
  "workMode": "HYBRID",
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "",
  "salaryAmount": "",
  "salaryPeriod": "MONTHLY",
  "employmentType": "",
  "jobFunction": "",
  "incentives": "",
  "selectionProcess": "",
  "notesHighlights": "",
  "applyLink": "",
  "customSlug": "",
  "expiresAt": "",
  "applicationDetails": null
}
```

## Walk-in

```json
{
  "type": "WALKIN",
  "title": "",
  "company": "",
  "companyWebsite": "",
  "description": "",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["B.Tech", ""],
  "allowedSpecializations": ["Computer Science"],
  "allowedPassoutYears": [],
  "requiredSkills": [],
  "locations": [],
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "",
  "salaryAmount": "",
  "salaryPeriod": "MONTHLY",
  "employmentType": "",
  "jobFunction": "",
  "incentives": "",
  "selectionProcess": "",
  "notesHighlights": "",
  "customSlug": "",
  "expiresAt": "",
  "venueAddress": "",
  "venueLink": "",
  "dateRange": "",
  "timeRange": "",
  "requiredDocuments": [],
  "contactPerson": "",
  "contactPhone": "",
  "startDate": "",
  "endDate": "",
  "startTime": "10:00",
  "endTime": "13:00",
  "applicationDetails": null,
  "walkInDetails": {
    "dateRange": "",
    "timeRange": "",
    "reportingTime": "",
    "dates": ["", ""],
    "venueAddress": "",
    "venueLink": "",
    "requiredDocuments": [],
    "contactPerson": "",
    "contactPhone": ""
  }
}
```

## Notes
- Arrays can also be provided as comma-separated strings in many fields, but arrays are preferred.
- For walk-ins, top-level fields and `walkInDetails` are both supported. If both are provided, `walkInDetails` takes priority.
- `salaryRange` and `salaryAmount` can be used together; if you provide both, `salaryRange` is kept as entered.



## Content Distribution Rules

### Description Usage (Very Important)

- `description` must contain at least 80-90% of all useful job information.
- If a responsibility, qualification, requirement, preferred skill, technology, certification, or role expectation is important enough to mention, it belongs in description, not notesHighlights.
- Use `description` for:
  - Role overview
  - Responsibilities
  - Requirements
  - Eligibility
  - Educational qualifications
  - Experience requirements
  - Preferred qualifications
  - Domain knowledge requirements
  - Certifications
  - Role expectations
  - Work environment details
  - Selection process details (if available)
- If in doubt, place the information in `description`.

### Notes / Highlights Usage

- `notesHighlights` should not exceed 25% of the size of `description`.
- If notes become longer than description, the extraction is invalid and must be rewritten.
- notesHighlights must never contain information that could materially affect a candidate's decision to apply.
- If removing notesHighlights would make the job description incomplete, the content belongs in description instead.

Move information to `notesHighlights` only when it is a special callout such as:

- Shift timing
- Bond / service agreement
- Immediate joiner requirement
- Own laptop requirement
- PPO opportunity
- Walk-in details
- Joining deadline
- Special eligibility restriction
- Unusual work condition
- Mandatory relocation requirement

Do NOT place the following in `notesHighlights`:

- Responsibilities
- Requirements
- Skills
- Technologies
- Preferred qualifications
- Experience preferences
- Educational requirements
- Domain knowledge requirements
- Certifications
- Role expectations

### Quality Check

- If `notesHighlights` becomes longer than `description`, the extraction is likely incorrect.
- Do not use `notesHighlights` as an overflow section for job content.

## Skills Handling

- Do NOT duplicate skills between `requiredSkills` and `description`.
- All technologies, tools, programming languages, frameworks, platforms, and technical skills should primarily be captured in `requiredSkills`.
- Do not create a separate "Skills Required" section in `description` if the same skills already exist in `requiredSkills`.
- Mention skills in `description` only when the JD explicitly emphasizes them as mandatory, preferred, strongly desired, critical, or central to the role.
- When mentioning such skills in `description`, write them naturally within responsibilities or requirements instead of repeating the entire skill list.
- Avoid keyword stuffing.
- The same skill should not be repeatedly listed in `requiredSkills`, `description`, and `notesHighlights`.

### Example

❌ Bad

```json
"requiredSkills": ["Python", "FastAPI", "Azure", "Docker"],
"description": "Skills Required: Python, FastAPI, Azure, Docker..."
```

✅ Good

```json
"requiredSkills": ["Python", "FastAPI", "Azure", "Docker"],
"description": "Develop scalable backend services and cloud-native applications. Strong Python expertise is considered important for success in this role."
```

## Incentives Handling

- Include only actual employee benefits, allowances, bonuses, insurance, reimbursements, perks, or company-provided advantages in `incentives`.
- Do not leave incentives empty if the job description clearly mentions benefits.
- Examples:
  - Health Insurance
  - Medical Insurance
  - Accident Insurance
  - Shift Allowance
  - Cab Facility
  - Meal Benefits
  - Joining Bonus
  - Annual Bonus
  - PPO Opportunity
  - Flexible Work Arrangement
  - Learning Programs
  - Certification Support
  - Wellness Benefits
- Do not copy generic company culture statements into `incentives`.

- Before leaving `incentives` empty, explicitly check for:
  - Insurance
  - Medical benefits
  - Accident coverage
  - Cab facility
  - Shift allowance
  - Bonuses
  - PPO
  - Learning programs
  - Certification support
  - Flexible work
  - Wellness benefits
  - Employee discounts
  - Leave benefits

## Description Formatting Preference

Use structured sections whenever sufficient information is available:

**About the Role**
...

**Responsibilities**
- ...
- ...

**Requirements**
- ...
- ...

**Eligibility**
- ...
- ...

**Benefits**
- ...
- ...

Avoid moving meaningful content into `notesHighlights` when it naturally belongs in these sections.



## Salary Handling

- If salary is not explicitly mentioned in the JD, leave both `salaryRange` and `salaryAmount` empty.
- Never estimate, infer, calculate, assume, or generate salary from market standards, experience level, company reputation, or similar roles.
- Terms such as "Competitive Salary", "As per company standards", "Best in industry", "Negotiable", or "Attractive package" should NOT be converted into salary figures.
- Only populate salary fields when an exact amount, range, stipend, CTC, or compensation figure is explicitly stated.



  ## Apply Link Handling

- Always provide the direct application URL whenever available.
- Do not provide company career homepage links when a direct application page exists.
- If an email application is explicitly requested instead of an application form, use the job posting URL in `applyLink` and mention the email application process in `description`.

## Email Application Jobs

- If the JD instructs candidates to apply through email, include the email address inside `description`.
- Do not place application email addresses inside `notesHighlights`.
- Mention whether resume only or resume + cover letter is required.

## Experience Handling

- Only populate `experienceMin` and `experienceMax` when explicitly stated or clearly derivable from the JD.
- Do not infer experience requirements from skills, responsibilities, seniority labels, or technology stack complexity.
- Terms such as "preferred", "nice to have", "internship experience", or "academic project experience" should not automatically increase minimum experience.

## Company Name Handling

- Use the actual hiring company name mentioned in the JD.
- Do not use "One of our clients", "Confidential", platform names, job board names, or staffing partner names unless they are explicitly the employer.
- Verify company name from the job posting before generating JSON.

## Extraction Accuracy

- Never infer, assume, estimate, or generate information that is not explicitly stated in the JD.
- If information is missing, leave the field empty.
- Do not derive salary, passout years, experience ranges, benefits, selection process, work mode, or eligibility from assumptions.
- Prefer empty fields over guessed values.

## Location Handling

- **City Only Principle**: In the `locations` array, only specify the **city name** (e.g., `["Noida"]`, `["Hyderabad"]`).
- **Do NOT include state or country names** alongside the city (e.g., do NOT write `"Hyderabad Telangana India"`, `"Noida, Uttar Pradesh, India"`, etc.). The frontend dynamically maps cities to states; full strings break the UI/UX layout.
- **State Fallback**: If and only if no specific city is mentioned in the job description, specify the **state name** (e.g., `["Uttar Pradesh"]`, `["Telangana"]`).
- **Quality Data**: Keep location data strictly accurate and high quality. Never guess or estimate location names.

## Formatting for AI Models & Parsers

- **Use of Line Breaks (`\n`)**: This file is primarily consumed by AI extraction models. To ensure proper JSON formatting and clean visual rendering:
  - Inside JSON string fields (like `description`, `notesHighlights`, `selectionProcess`, etc.), always use `\n` for line breaks or bullet points.
  - Do not use raw physical carriage returns inside JSON strings; escape them with `\n`.
  - Do not use `/n`. Always use `\n`.
  - If notes or other key highlights have multiple features/points, break them cleanly using `\n` to keep the layout readable.