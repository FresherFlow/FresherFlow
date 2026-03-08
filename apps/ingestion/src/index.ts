import express from 'express';
import { logger } from '@fresherflow/logger';

import { startIngestionScheduler } from './scheduler';

const app = express();
const port = process.env.PORT || 3005;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'ingestion' });
});

app.listen(port, () => {
    logger.info(`Ingestion service listening at http://localhost:${port}`);
    // Boot the scheduler loop
    startIngestionScheduler();
});
