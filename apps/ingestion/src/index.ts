import 'dotenv/config';
import express from 'express';
import { logger, setupCleanLogging } from '@fresherflow/logger';

setupCleanLogging();

import { startIngestionScheduler } from './scheduler';

const app = express();
const port = process.env.PORT || 5002;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'ingestion' });
});

app.listen(port, () => {
    logger.info(`Ingestion service listening at http://localhost:${port}`);
    // Boot the scheduler loop
    startIngestionScheduler();
});
