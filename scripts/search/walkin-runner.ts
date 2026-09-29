import fs from 'node:fs/promises';
import { collectWalkinDrives, loadEnv } from '@fresherflow/pipeline';

async function runWalkinDiscovery() {
  await loadEnv();
  const startTime = Date.now();

  console.log(`\n======================================================`);
  console.log(`ðŸ—ºï¸ STARTING HYDERABAD WALKIN MAP DISCOVERY ENGINE`);
  console.log(`======================================================`);

  const walkins = await collectWalkinDrives({ resultsPerQuery: 10 });

  // Save to JSON artifact
  await fs.writeFile('hyderabad_walkins.json', JSON.stringify(walkins, null, 2), 'utf8');
  console.log(`[Storage] Saved ${walkins.length} Hyderabad walk-ins to hyderabad_walkins.json\n`);

  // Group by Tech Cluster
  const byCluster: Record<string, typeof walkins> = {};
  for (const w of walkins) {
    const clusterName = w.cluster.cluster.name;
    if (!byCluster[clusterName]) byCluster[clusterName] = [];
    byCluster[clusterName].push(w);
  }

  console.log(`======================================================`);
  console.log(`ðŸ“ HYDERABAD TECH CLUSTERS BREAKDOWN`);
  console.log(`======================================================`);
  for (const [cluster, list] of Object.entries(byCluster)) {
    console.log(`ðŸ¢ ${cluster}: ${list.length} walk-in drives`);
  }

  console.log(`\n======================================================`);
  console.log(`ðŸŽ¯ TOP DISCOVERED WALKIN DRIVES IN HYDERABAD`);
  console.log(`======================================================`);

  walkins.slice(0, 10).forEach((w, i) => {
    console.log(`${i + 1}. [${w.company}] ${w.title}`);
    console.log(`   ðŸ“ Cluster:  ${w.cluster.cluster.name} (${w.cluster.latitude}, ${w.cluster.longitude})`);
    console.log(`   ðŸ¢ Venue:    ${w.walkInDetails.venueAddress}`);
    console.log(`   â° Timing:   ${w.walkInDetails.timeRange || w.walkInDetails.reportingTime}`);
    console.log(`   ðŸ—ºï¸ Maps Nav: ${w.cluster.mapsUrl}`);
    console.log(`   ðŸ”— Apply:    ${w.applyLink}\n`);
  });

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`======================================================`);
  console.log(`âœ… COMPLETED IN ${durationSec}s | TOTAL WALKINS: ${walkins.length}`);
  console.log(`======================================================\n`);
}

runWalkinDiscovery()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal Walkin Runner Error:', err);
    process.exit(1);
  });
