import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import './db.js';
import authRoutes from './routes/auth.js';
import assetRoutes from './routes/assets.js';
import storageRoutes from './routes/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: '3D Asset Management Core Service', port: 8912 });
});

app.use('/api', authRoutes);
app.use('/api', assetRoutes);
app.use('/api', storageRoutes);

app.use((_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'API不存在' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message || '服务器内部错误' });
});

export default app;
