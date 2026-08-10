export function analyze(jobs: any[]): any {
  return {
    summary: summarize(jobs),
    companies: analyzeCompanies(jobs),
    siteComparison: compareSites(jobs),
  };
}

export function summarize(jobs: any[]): any {
  const remoteCount = jobs.filter((j) => j.isRemote || j.workMode === 'REMOTE').length;
  const withSalary = jobs.filter((j) => j.compensation?.minAmount || j.salaryRange);

  let salaryStats: any = null;
  if (withSalary.length > 0) {
    const amounts = withSalary.map((j) => j.compensation?.minAmount || 0).filter(Boolean);
    const maxAmounts = withSalary
      .map((j) => j.compensation?.maxAmount ?? j.compensation?.minAmount)
      .filter((a) => a != null);

    if (amounts.length > 0) {
      salaryStats = {
        minSalary: Math.min(...amounts),
        maxSalary: Math.max(...maxAmounts),
        avgSalary: Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length),
        currency: withSalary[0].compensation?.currency ?? 'INR',
      };
    }
  }

  const bySite: Record<string, number> = {};
  for (const job of jobs) {
    const site = job.site || job.source || 'unknown';
    bySite[site] = (bySite[site] ?? 0) + 1;
  }

  const byJobType: Record<string, number> = {};
  for (const job of jobs) {
    if (job.jobType) {
      for (const jt of (Array.isArray(job.jobType) ? job.jobType : [job.jobType])) {
        byJobType[jt] = (byJobType[jt] ?? 0) + 1;
      }
    } else if (job.type) {
      byJobType[job.type] = (byJobType[job.type] ?? 0) + 1;
    }
  }

  const byLocation: Record<string, number> = {};
  for (const job of jobs) {
    const loc = job.location || (job.parsedLocation ? [job.parsedLocation.city, job.parsedLocation.region].filter(Boolean).join(', ') : null);
    const key = loc || 'Unknown';
    byLocation[key] = (byLocation[key] ?? 0) + 1;
  }

  return {
    totalJobs: jobs.length,
    remoteCount,
    remotePercentage: jobs.length > 0 ? Math.round((remoteCount / jobs.length) * 100) : 0,
    withSalaryCount: withSalary.length,
    salaryStats,
    bySite,
    byJobType,
    byLocation,
  };
}

export function analyzeCompanies(jobs: any[]): any[] {
  const companies = new Map<string, {
    count: number;
    roles: string[];
    locations: Set<string>;
    emails: Set<string>;
    url?: string | null;
  }>();

  for (const job of jobs) {
    const name = job.companyName || job.company || 'Unknown';
    const existing = companies.get(name) ?? {
      count: 0,
      roles: [],
      locations: new Set<string>(),
      emails: new Set<string>(),
    };

    existing.count++;
    existing.roles.push(job.title);
    if (job.companyUrl || job.companyWebsite) existing.url = job.companyUrl || job.companyWebsite;

    const loc = job.location || (job.parsedLocation ? [job.parsedLocation.city, job.parsedLocation.region].filter(Boolean).join(', ') : null);
    if (loc) {
      existing.locations.add(loc);
    }
    if (job.emails) {
      for (const e of job.emails) existing.emails.add(e);
    }

    companies.set(name, existing);
  }

  return [...companies.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, data]) => ({
      companyName: name,
      openPositions: data.count,
      locations: [...data.locations],
      roles: data.roles,
      emails: [...data.emails],
      companyUrl: data.url,
    }));
}

export function compareSites(jobs: any[]): any[] {
  const sites = new Map<string, any[]>();
  for (const job of jobs) {
    const site = job.site || job.source || 'unknown';
    const list = sites.get(site) ?? [];
    list.push(job);
    sites.set(site, list);
  }

  return [...sites.entries()].map(([site, siteJobs]) => ({
    site,
    totalJobs: siteJobs.length,
    withSalary: siteJobs.filter((j) => j.compensation?.minAmount || j.salaryRange).length,
    remoteJobs: siteJobs.filter((j) => j.isRemote || j.workMode === 'REMOTE').length,
    uniqueCompanies: new Set(siteJobs.map((j) => j.companyName || j.company).filter(Boolean)).size,
  }));
}
