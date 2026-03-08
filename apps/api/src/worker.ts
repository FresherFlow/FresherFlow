import dotenv from 'dotenv';
import { logger } from '@fresherflow/logger';


dotenv.config();

logger.info('Starting FresherFlow worker process', {
    nodeEnv: process.env.NODE_ENV || 'development'
});



process.on('SIGTERM', () => {
    logger.info('Worker SIGTERM received, shutting down');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('Worker SIGINT received, shutting down');
    process.exit(0);
});
