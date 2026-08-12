export function detectAtsFromUrl(url: string | null | undefined): string {
  if (!url) return 'Other/Direct';
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('myworkdayjobs')) return 'Workday';
  if (lowerUrl.includes('greenhouse.io') || lowerUrl.includes('boards.greenhouse.io')) return 'Greenhouse';
  if (lowerUrl.includes('jobs.lever.co')) return 'Lever';
  if (lowerUrl.includes('smartrecruiters.com')) return 'SmartRecruiters';
  if (lowerUrl.includes('jobs.ashbyhq.com')) return 'Ashby';
  if (lowerUrl.includes('breezy.hr')) return 'Breezy HR';
  if (lowerUrl.includes('icims.com')) return 'iCIMS';
  if (lowerUrl.includes('workable.com')) return 'Workable';
  if (lowerUrl.includes('bamboohr.com')) return 'BambooHR';
  if (lowerUrl.includes('careers-page.com') || lowerUrl.includes('careers.page')) return 'CareersPage';
  if (lowerUrl.includes('recruitee.com')) return 'Recruitee';
  if (lowerUrl.includes('jobvite.com')) return 'Jobvite';
  if (lowerUrl.includes('eightfold.ai')) return 'Eightfold';
  if (lowerUrl.includes('phenompro.com') || lowerUrl.includes('phenompeople.com')) return 'Phenom';
  if (lowerUrl.includes('taleo.net')) return 'Taleo';
  if (lowerUrl.includes('brassring.com')) return 'BrassRing';
  
  return 'Other/Direct';
}
