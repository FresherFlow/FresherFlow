import { AtsAdapter, AtsJob, fetchJson, htmlToPlainText } from '../../base/BaseAdapter.js';

interface BaytJob {
  id?: string | number;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  posted_date?: string;
  url?: string;
}

export class BaytAdapter implements AtsAdapter {
  providerName = 'Bayt';

  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const keyword = companyId.trim() || companyName.trim();
    if (!keyword) return [];

    const url = `https://www.bayt.com/api/v1/jobs?keyword=${encodeURIComponent(keyword)}&country=in`;
    const data = await fetchJson<{ jobs?: BaytJob[]; data?: BaytJob[] }>(url, {}, 'Bayt');

    if (!data) return [];
    const jobs = data.jobs || data.data || (Array.isArray(data) ? (data as unknown as BaytJob[]) : []);
    if (!jobs.length) return [];

    return jobs.map((j) => {
      const atsId = String(j.id ?? Math.random().toString(36).substring(7));
      const title = j.title?.trim() || 'Unknown Title';
      const locStr = j.location || 'India / Middle East';
      const isRemote = /remote|wfh/i.test(`${locStr} ${title}`);
      const plainDesc = j.description ? htmlToPlainText(j.description) : undefined;
      const applyLink = j.url || `https://www.bayt.com/en/india/jobs/${atsId}`;

      return {
        id: `bayt-${atsId}`,
        title,
        applyLink,
        company: j.company || companyName || keyword,
        location: locStr,
        parsedLocation: { raw: locStr, remote: isRemote },
        description: plainDesc,
        descriptionSource: plainDesc ? 'HTML' : 'NONE',
        postedAt: j.posted_date || undefined,
        source: 'AGGREGATOR_BAYT',
        sourceType: 'AGGREGATOR' as const,
      };
    });
  }
}
