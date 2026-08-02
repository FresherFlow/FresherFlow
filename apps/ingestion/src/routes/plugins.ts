import { Router, Request, Response } from 'express';
import { PLUGIN_REGISTRY, getPluginCategories } from '@fresherflow/plugins';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  const categories = getPluginCategories();
  res.json({
    status: 'ok',
    total: categories.total,
    categories
  });
});

router.get('/', (req: Request, res: Response) => {
  const categories = getPluginCategories();
  const plugins = Object.entries(PLUGIN_REGISTRY).map(([provider, adapter]) => ({
    provider,
    providerName: adapter.providerName || provider,
    hasDetailFetcher: typeof adapter.fetchJobDetails === 'function',
    category: categories.boards.includes(provider)
      ? 'board'
      : categories.companies.includes(provider)
      ? 'company'
      : 'ats'
  }));

  res.json({
    total: plugins.length,
    categories,
    plugins
  });
});

router.get('/:provider', (req: Request, res: Response): void => {
  const rawProvider = req.params.provider;
  const provider = (Array.isArray(rawProvider) ? rawProvider[0] : rawProvider) || '';
  const providerKey = provider.toLowerCase();
  const adapter = PLUGIN_REGISTRY[providerKey];

  if (!adapter) {
    res.status(404).json({ error: `Plugin '${provider}' not found` });
    return;
  }

  res.json({
    provider: providerKey,
    providerName: adapter.providerName || provider,
    hasDetailFetcher: typeof adapter.fetchJobDetails === 'function'
  });
});

export default router;
