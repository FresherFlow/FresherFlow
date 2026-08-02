import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import runRouter from './routes/run.js';
import pluginsRouter from './routes/plugins.js';
import { PLUGIN_REGISTRY } from '@fresherflow/plugins';
import statsRouter from './routes/stats.js';

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    plugins: Object.keys(PLUGIN_REGISTRY).length
  });
});

app.use('/plugins', pluginsRouter);
app.use('/run', runRouter);
app.use('/stats', statsRouter);

const server = app.listen(port, () => {
  console.log(`Ingestion service listening on port ${port}`);
});

server.setTimeout(120000);
