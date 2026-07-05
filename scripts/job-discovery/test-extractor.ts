import { extractAtsBoard } from './src/core/ats-detector.js';

const urls = [
    'https://boards.greenhouse.io/canonical/jobs/123',
    'https://jobs.lever.co/meesho/456',
    'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/xxx',
    'https://jobs.ashbyhq.com/uipath',
    'https://jobs.smartrecruiters.com/Eurofins/789',
    'https://university-uber.icims.com/jobs/123/login',
    'https://egug.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/123',
    'https://careers.google.com'
];

for (const u of urls) {
    console.log(u, '->', extractAtsBoard(u));
}
