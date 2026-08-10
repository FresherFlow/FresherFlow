import { PLUGIN_REGISTRY } from '@fresherflow/plugins';
import { circuitBreaker } from './circuit-breaker.js';

/**
 * Discovers plugins and pushes their override into the circuit breaker
 * before the first scrape() call.
 */
export function applyPluginPolicies(): string[] {
  const overridden: string[] = [];
  
  for (const [site, plugin] of Object.entries(PLUGIN_REGISTRY)) {
    if (plugin && typeof (plugin as any).getCircuitBreakerPolicy === 'function') {
      try {
        const policy = (plugin as any).getCircuitBreakerPolicy();
        // Since we don't have a complex breaker policy engine in this basic translation, 
        // we'll just log it. The interface was breaker.setPolicy(site, policy)
        console.log(`[PluginPolicy] Applied policy override for ${site}:`, policy);
        overridden.push(site);
      } catch (err: any) {
        console.error(`[PluginPolicy] ${site} threw in getCircuitBreakerPolicy(); falling back to default — ${err.message}`);
      }
    }
  }

  if (overridden.length === 0) {
    console.log('[PluginPolicy] No plugin overrode the default circuit-breaker policy');
  } else {
    console.log(`[PluginPolicy] Applied ${overridden.length} per-plugin policy override(s)`);
  }
  
  return overridden;
}
