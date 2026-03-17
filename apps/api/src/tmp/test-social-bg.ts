import prisma from '../lib/prisma';
import { handleOpportunityPublished } from '../services/publish.service';
import { Opportunity } from '@fresherflow/types';

async function main() {
  const opportunity = await prisma.opportunity.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { postedAt: 'desc' }
  });

  if (!opportunity) {
    process.exit(1);
  }

  // Trigger publish side-effects (Social Posting should now ENQUEUE jobs)
  await handleOpportunityPublished(opportunity as unknown as Opportunity, { isNew: false });
  // eslint-disable-next-line no-console
  console.log('Enqueued social posts. Check your worker logs.');
}

main().catch(() => process.exit(1));
