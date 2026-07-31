import { AtsAdapter, AtsJob, fetchJson } from '../../base/BaseAdapter.js';

interface NvidiaJob {
  id: string;
  displayJobId?: string;
  name?: string;
  locations?: string[];
  department?: string;
  workLocationOption?: string;
  postedTs?: number;
  positionUrl?: string;
}

interface NvidiaResponse {
  data?: { positions?: NvidiaJob[] };
}

export class NvidiaAdapter implements AtsAdapter {
  providerName = 'NVIDIA';

  async fetchJobs(_companyId: string, _companyName: string): Promise<AtsJob[]> {
    const jobs: AtsJob[] = [];
    const maxResults = 100;
    let start = 0;
    let consecutiveEmpty = 0;

    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0',
    };

    while (jobs.length < maxResults && consecutiveEmpty < 3) {
      const url = `https://nvidia.eightfold.ai/api/pcsx/search?domain=nvidia.com&query=&location=&start=${start}&sort_by=timestamp`;
      const data = await fetchJson<NvidiaResponse>(url, { headers }, 'NVIDIA');
      
      const positions = data?.data?.positions ?? [];
      if (!positions.length) {
        consecutiveEmpty++;
        start += 10;
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      consecutiveEmpty = 0;
      for (const p of positions) {
        if (jobs.length >= maxResults) break;
        if (!p.name) continue;

        const locStr = p.locations?.[0] ?? '';
        const locParts = locStr.split(',').map((s) => s.trim());
        const applyLink = p.positionUrl ? `https://nvidia.eightfold.ai${p.positionUrl}` : `https://nvidia.eightfold.ai/careers?query=${p.id}`;

        jobs.push({
          id: `nvidia-${p.id}`,
          title: p.name,
          applyLink,
          company: 'NVIDIA',
          location: locStr || undefined,
          parsedLocation: locStr ? { raw: locStr, city: locParts[0], remote: locStr.toLowerCase().includes('remote') } : undefined,
          descriptionSource: 'NONE',
          postedAt: p.postedTs ? new Date(p.postedTs * 1000).toISOString().split('T')[0] : undefined,
          department: p.department,
          source: 'COMPANY_NVIDIA',
          sourceType: 'ATS' as const,
        });
      }
      
      start += 10;
      await new Promise(r => setTimeout(r, 500));
    }

    return jobs;
  }
}
