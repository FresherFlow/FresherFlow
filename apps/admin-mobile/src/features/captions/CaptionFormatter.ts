import { Opportunity } from '@fresherflow/types';

// Hardcoded for now as in the web version
const PROD_SITE_URL = 'https://fresherflow.in';
export type Platform = 'whatsapp' | 'telegram' | 'twitter' | 'linkedin';

export const capitalizeSkill = (skill: string) => 
    skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

export const getExperienceText = (opp: Opportunity) => {
    const min = opp.experienceMin;
    const max = opp.experienceMax;
    if (min === undefined && max === undefined) return 'Fresher/0–2 years';
    if (min === 0 && (max === 0 || !max)) return 'Fresher';
    if (min !== undefined && max !== undefined) {
        return `${min === 0 ? 'Fresher' : min}–${max} years`;
    }
    return `${min || 0}+ years`;
};

export const getSalaryText = (opp: Opportunity) => {
    if (opp.salaryRange) return opp.salaryRange;
    const min = opp.salaryMin;
    const max = opp.salaryMax;
    if (typeof min === 'number' && typeof max === 'number') {
        return `₹${min}L – ₹${max}L`;
    }
    if (typeof min === 'number') return `₹${min}L+`;
    return '';
};

export const getDegreesText = (opp: Opportunity) => {
    if (opp.allowedCourses && opp.allowedCourses.length > 0) {
        return opp.allowedCourses.join(' / ');
    }
    if (opp.allowedDegrees && opp.allowedDegrees.length > 0) {
        return opp.allowedDegrees.join(' / ');
    }
    return 'B.E / B.Tech / MCA / Any Graduate';
};

export const getBatchYearsText = (opp: Opportunity) => {
    if (opp.allowedPassoutYears && opp.allowedPassoutYears.length > 0) {
        const sorted = [...opp.allowedPassoutYears].sort((a, b) => a - b);
        if (sorted.length === 1) {
            return `${sorted[0]} Batch`;
        }
        return `${sorted.join(' / ')} Batch`;
    }
    return '';
};

export const getNumberEmoji = (num: number): string => {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    if (num <= 10) return emojis[num - 1];
    return `🔹`;
};

export const getCleanHashtag = (str?: string) => {
    if (!str) return '';
    const clean = str.replace(/[^a-zA-Z0-9]/g, '');
    return clean ? `#${clean}` : '';
};

export const formatSingleCaption = (opp: Opportunity, platform: Platform) => {
    const salary = getSalaryText(opp);
    const exp = getExperienceText(opp);
    const degrees = getDegreesText(opp);
    const batchYears = getBatchYearsText(opp);
    
    // Limit to 3-4 core skills
    const skillsSlice = opp.requiredSkills && opp.requiredSkills.length > 0 
        ? opp.requiredSkills.slice(0, 4).map(capitalizeSkill) 
        : [];
    const skillsLine = skillsSlice.length > 0 ? skillsSlice.join(', ') : '';
    
    const locations = opp.locations && opp.locations.length > 0 
        ? opp.locations.join(' / ') 
        : 'India';

    const companyHash = getCleanHashtag(opp.company);
    const firstLocation = opp.locations && opp.locations.length > 0 ? opp.locations[0] : '';
    const cleanLoc = firstLocation.replace(/[^a-zA-Z0-9]/g, '');
    const locationHash = cleanLoc ? `#${cleanLoc}Jobs` : '';

    if (platform === 'telegram') {
        const tgSkills = skillsLine ? `\n⚡ Skills: ${skillsLine}` : '';
        const tgSalary = salary ? `\n💰 Salary: ${salary}` : '';
        const tgBatch = batchYears ? `\n🎯 Batch: ${batchYears}` : '';

        return `🚀 ${opp.company} Hiring ${opp.title}

🎓 Eligibility: ${degrees}${tgBatch}
💼 Experience: ${exp}
📍 Location: ${locations}${tgSkills}${tgSalary}

⭕️ Apply Now:
${PROD_SITE_URL}/${opp.slug}

📱 More jobs: ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app`;
    }

    if (platform === 'twitter') {
        const twBatch = batchYears ? `\n🎯 ${batchYears}` : '';
        const twHashtags = (companyHash && locationHash) ? `${companyHash} ${locationHash} #Freshers` : '#Jobs #Hiring #Freshers';

        return `🚀 ${opp.company} Hiring ${opp.title}
${twBatch}
💼 ${exp}
📍 ${locations}

Apply 👇
${PROD_SITE_URL}/${opp.slug}

${twHashtags}`;
    }

    if (platform === 'linkedin') {
        const liSkills = skillsLine ? `\n⚡ Skills: ${skillsLine}` : '';
        const liSalary = salary ? `\n💰 Salary: ${salary}` : '';
        const liBatch = batchYears ? `\n🎯 Batch: ${batchYears}` : '';
        const liHashtags = (companyHash && locationHash) ? `${companyHash} ${locationHash} #Careers` : '#Hiring #Freshers #Jobs';

        return `🚀 ${opp.company} Hiring ${opp.title}

🎓 Eligibility: ${degrees}${liBatch}
💼 Experience: ${exp}
📍 Location: ${locations}${liSkills}${liSalary}

Apply:
${PROD_SITE_URL}/${opp.slug}

📱 More jobs: ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app

${liHashtags}`;
    }

    // Default: whatsapp
    const waSkills = skillsLine ? `\n> ⚡ *Skills:* ${skillsLine}` : '';
    const waSalary = salary ? `\n> 💰 *Salary:* ${salary}` : '';
    const waBatch = batchYears ? `\n> 🎯 *Batch:* ${batchYears}` : '';

    return `🚀 *${opp.company}* Hiring *${opp.title}*

> 🎓 *Eligibility:* ${degrees}${waBatch}
> 💼 *Experience:* ${exp}
> 📍 *Location:* ${locations}${waSkills}${waSalary}

⭕️ *Apply Now:*
${PROD_SITE_URL}/${opp.slug}

📱 *More jobs on FresherFlow:* ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app`;
};

export const formatBulkCaption = (opportunities: Opportunity[], platform: Platform) => {
    if (opportunities.length === 0) return '';

    if (platform === 'whatsapp') {
        let body = `🚨 *Today's Job Updates*\n\n`;
        opportunities.forEach((opp, index) => {
            const numEmoji = getNumberEmoji(index + 1);
            body += `${numEmoji} *${opp.company}*\n> ${opp.title}\n🔗 ${PROD_SITE_URL}/${opp.slug}\n\n`;
        });
        body += `📱 *More jobs:* ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app`;
        return body;
    }

    if (platform === 'telegram') {
        let body = `🚨 Today's Job Updates\n\n`;
        opportunities.forEach((opp, index) => {
            const numEmoji = getNumberEmoji(index + 1);
            body += `${numEmoji} ${opp.company} — ${opp.title}\n🔗 ${PROD_SITE_URL}/${opp.slug}\n\n`;
        });
        body += `📱 More jobs: ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app`;
        return body;
    }

    if (platform === 'twitter') {
        let body = `🚨 Today's Job Updates\n\n`;
        opportunities.forEach((opp, index) => {
            const numEmoji = getNumberEmoji(index + 1);
            body += `${numEmoji} ${opp.company} — ${opp.title}\n${PROD_SITE_URL}/${opp.slug}\n\n`;
        });
        body += `#Jobs #Hiring #Freshers`;
        return body;
    }

    if (platform === 'linkedin') {
        let body = `🚨 Today's Job Updates\n\n`;
        opportunities.forEach((opp, index) => {
            const numEmoji = getNumberEmoji(index + 1);
            body += `${numEmoji} ${opp.company} — ${opp.title}\nApply: ${PROD_SITE_URL}/${opp.slug}\n\n`;
        });
        body += `📱 More jobs: ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app\n\n#Hiring #Freshers #Jobs`;
        return body;
    }

    return '';
};
