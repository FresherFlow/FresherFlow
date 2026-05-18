const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Generating bootstrap feed...');
  
  try {
    const opportunities = await prisma.opportunity.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 50,
      include: {
        user: {
          select: {
            fullName: true,
            trustLevel: true,
          },
        },
      },
    });

    const feed = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      total: opportunities.length,
      opportunities: opportunities.map(o => ({
        ...o,
        // Match the API structure
        matchScore: 0,
        isEligible: true,
      })),
    };

    const outputPath = path.join(__dirname, '../apps/mobile/assets/bootstrap-feed.min.json');
    
    // Ensure assets directory exists
    const assetsDir = path.dirname(outputPath);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(feed));
    
    console.log(`✅ Success! Generated ${opportunities.length} jobs.`);
    console.log(`📍 Path: ${outputPath}`);
    console.log('\nTo test locally:');
    console.log('1. Start a local server: npx serve apps/mobile/assets');
    console.log('2. Update apps/mobile/src/config/api.ts to point to your local IP.');
  } catch (error) {
    console.error('❌ Failed to generate feed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
