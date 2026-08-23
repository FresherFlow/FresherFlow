import fs from 'node:fs/promises';
import { collectHyderabadWalkinDrives, loadEnv } from '@fresherflow/pipeline';

async function runWalkinDiscovery() {
  await loadEnv();
  const startTime = Date.now();

  console.log(`\n======================================================`);
  console.log(`🗺️ STARTING HYDERABAD WALKIN MAP DISCOVERY ENGINE`);
  console.log(`======================================================`);

  const walkins = await collectHyderabadWalkinDrives({ resultsPerQuery: 10 });

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
  console.log(`📍 HYDERABAD TECH CLUSTERS BREAKDOWN`);
  console.log(`======================================================`);
  for (const [cluster, list] of Object.entries(byCluster)) {
    console.log(`🏢 ${cluster}: ${list.length} walk-in drives`);
  }

  console.log(`\n======================================================`);
  console.log(`🎯 TOP DISCOVERED WALKIN DRIVES IN HYDERABAD`);
  console.log(`======================================================`);

  walkins.slice(0, 10).forEach((w, i) => {
    console.log(`${i + 1}. [${w.company}] ${w.title}`);
    console.log(`   📍 Cluster:  ${w.cluster.cluster.name} (${w.cluster.latitude}, ${w.cluster.longitude})`);
    console.log(`   🏢 Venue:    ${w.walkInDetails.venueAddress}`);
    console.log(`   ⏰ Timing:   ${w.walkInDetails.timeRange || w.walkInDetails.reportingTime}`);
    console.log(`   🗺️ Maps Nav: ${w.cluster.mapsUrl}`);
    console.log(`   🔗 Apply:    ${w.applyLink}\n`);
  });

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`======================================================`);
  console.log(`✅ COMPLETED IN ${durationSec}s | TOTAL WALKINS: ${walkins.length}`);
  console.log(`======================================================\n`);
}

runWalkinDiscovery()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal Walkin Runner Error:', err);
    process.exit(1);
  });
