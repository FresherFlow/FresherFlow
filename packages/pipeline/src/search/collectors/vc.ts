import { AtsJob, PLUGIN_REGISTRY } from '@fresherflow/plugins';

export async function collectVcStartupPortals(): Promise<AtsJob[]> {
  console.log(`\n=== VC Startup Portals Collector (Getro & Consider Engines) ===`);
  const getroAdapter = PLUGIN_REGISTRY['getro'];
  const considerAdapter = PLUGIN_REGISTRY['consider'];

  const getroCollections = [
    { id: '32333', name: 'Blume Ventures' },
    { id: '8672', name: 'Accel Portfolio' },
    { id: '222', name: 'General Catalyst' },
  ];

  const considerPortals = [
    { url: 'https://careers.peakxv.com', name: 'Peak XV Partners' },
    { url: 'https://jobs.lsvp.com', name: 'Lightspeed' },
    { url: 'https://jobs.nexusvp.com', name: 'Nexus VP' },
    { url: 'https://jobs.bvp.com', name: 'Bessemer VP' },
  ];

  const allVcJobs: AtsJob[] = [];

  // 1. Getro-powered VC Portals (Blume, Accel, GC)
  if (getroAdapter) {
    try {
      const getroResults = await Promise.all(
        getroCollections.map(async (c) => {
          try {
            const jobs = await getroAdapter.fetchJobs(c.id, c.name);
            return jobs.map((j) => ({
              ...j,
              source: `GetroVC (${c.name})`,
              sourceType: 'AGGREGATOR' as const,
            }));
          } catch (err: any) {
            console.warn(`  └─ [GetroVC] Failed fetching ${c.name}: ${err.message}`);
            return [];
          }
        })
      );
      const flatGetro = getroResults.flat();
      console.log(`  └─ [GetroVC] Fetched ${flatGetro.length} roles (Blume, Accel, GC)`);
      allVcJobs.push(...flatGetro);
    } catch (e: any) {
      console.error(`  └─ [GetroVC] Error: ${e.message}`);
    }
  }

  // 2. Consider-powered VC Portals (Lightspeed, Nexus, Bessemer)
  if (considerAdapter) {
    try {
      const considerResults = await Promise.all(
        considerPortals.map(async (p) => {
          try {
            const jobs = await considerAdapter.fetchJobs(p.url, p.name);
            return jobs.map((j) => ({
              ...j,
              source: `ConsiderVC (${p.name})`,
              sourceType: 'AGGREGATOR' as const,
            }));
          } catch (err: any) {
            console.warn(`  └─ [ConsiderVC] Failed fetching ${p.name}: ${err.message}`);
            return [];
          }
        })
      );
      const flatConsider = considerResults.flat();
      console.log(`  └─ [ConsiderVC] Fetched ${flatConsider.length} roles (Lightspeed, Nexus, Bessemer)`);
      allVcJobs.push(...flatConsider);
    } catch (e: any) {
      console.error(`  └─ [ConsiderVC] Error: ${e.message}`);
    }
  }

  console.log(`  └─ Total Combined VC Roles Fetched: ${allVcJobs.length}`);
  return allVcJobs;
}
