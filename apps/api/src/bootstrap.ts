import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately before any other imports evaluate
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') }); // Root .env

process.env.IS_API = 'true';
