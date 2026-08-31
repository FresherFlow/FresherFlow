import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import { PLUGIN_REGISTRY, getPluginCategories } from '@fresherflow/plugins';

export const dynamic = 'force-dynamic';

function getPlugins() {
  const categories = getPluginCategories();
  const plugins = Object.entries(PLUGIN_REGISTRY).map(([provider, adapter]) => ({
    provider,
    providerName: adapter.providerName || provider,
    hasDetailFetcher: typeof adapter.fetchJobDetails === 'function'
  }));

  return {
    plugins,
    boards: categories.boards,
    companies: categories.companies
  };
}

async function handleGetPlugins(request: NextRequest) {
  return NextResponse.json(getPlugins());
}

export const GET = withRateLimit(handleGetPlugins, { windowMs: 60_000, max: 60, keyPrefix: 'discovery-plugins' });