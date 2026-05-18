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
    private readonly DEBOUNCE_MS = 5000; // Wait 5s of quiet time before regenerating

    constructor() {
        super();
        this.on('refresh', this.handleRefresh.bind(this));
        logger.info('[DiscoveryEmitter] Initialized with 5s debounce');
    }

    private handleRefresh() {
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
        }, this.DEBOUNCE_MS) as unknown as NodeJS.Timeout;
    }

    public trigger() {
        this.emit('refresh');
    }
}

export const discoveryEmitter = new DiscoveryEmitter();
