import { NextResponse } from 'next/server';
import { PLUGIN_REGISTRY, getPluginCategories } from '@fresherflow/plugins';
export async function GET() {
  const categories = getPluginCategories();
  const plugins = Object.entries(PLUGIN_REGISTRY).map(([provider, adapter]: [string, any]) => ({
    provider,
    providerName: adapter.providerName || provider,
    hasDetailFetcher: typeof adapter.fetchJobDetails === 'function'
  }));
  return NextResponse.json({ plugins, boards: categories.boards, companies: categories.companies });
}
