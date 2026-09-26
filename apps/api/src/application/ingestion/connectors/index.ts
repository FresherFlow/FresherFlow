/**
 * Connector registry.
 *
 * `CUSTOM` deliberately reuses the JSON feed connector: a custom source is a
 * JSON endpoint with an idiosyncratic shape, and `jsonFeed`'s forgiving field
 * resolution is exactly what that needs. Introducing a separate "custom"
 * connector would be a new abstraction with no new behaviour.
 */

import { jsonFeedConnector } from './jsonFeed';
import { greenhouseConnector } from './greenhouse';
import { leverConnector } from './lever';
import { workdayConnector } from './workday';
import type { Connector } from '../types';
import type { IngestionSourceType } from '@fresherflow/database';

const CONNECTORS: Record<IngestionSourceType, Connector> = {
    JSON_FEED: jsonFeedConnector,
    WORKDAY: workdayConnector,
    GREENHOUSE: greenhouseConnector,
    LEVER: leverConnector,
    CUSTOM: jsonFeedConnector,
};

export function getConnector(sourceType: IngestionSourceType): Connector {
    const connector = CONNECTORS[sourceType];
    if (!connector) {
        // Unreachable for a valid enum value; explicit so an unmapped type
        // fails loudly at the run boundary rather than silently skipping a
        // source and reporting a healthy run.
        throw new Error(`No connector registered for source type ${sourceType}`);
    }
    return connector;
}

export function listSupportedSourceTypes(): IngestionSourceType[] {
    return Object.keys(CONNECTORS) as IngestionSourceType[];
}

export { jsonFeedConnector, greenhouseConnector, leverConnector, workdayConnector };
