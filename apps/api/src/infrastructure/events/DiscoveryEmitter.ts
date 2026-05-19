import { EventEmitter } from 'events';
import { logger } from '@fresherflow/logger';
import { StaticFeedService } from '../services/staticFeed.service';

/**
 * DiscoveryEmitter: Decouples business logic from static asset regeneration.
 * Uses a debounced approach to ensure high-frequency updates (e.g. batch imports)
 * don't thrash the filesystem or compute resources.
 */
class DiscoveryEmitter extends EventEmitter {
    private refreshTimeout: NodeJS.Timeout | null = null;

    constructor() {
        super();
        this.on('refresh', this.handleRefresh.bind(this));
        logger.info('[DiscoveryEmitter] Initialized — debounce set by FEED_REFRESH_DEBOUNCE_MS env var');
    }

    private handleRefresh() {
        const debounceMs = parseInt(process.env.FEED_REFRESH_DEBOUNCE_MS || '5000', 10);
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        this.refreshTimeout = setTimeout(async () => {
            try {
                await StaticFeedService.refresh();
                this.refreshTimeout = null;
            } catch (err) {
                logger.error('[DiscoveryEmitter] Refresh failed', err);
            }
        }, debounceMs) as unknown as NodeJS.Timeout;
    }

    public trigger() {
        this.emit('refresh');
    }
}

export const discoveryEmitter = new DiscoveryEmitter();
