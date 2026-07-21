import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.routes';
import socialRoutes from './routes/social.routes';
import adsRoutes from './routes/ads.routes';
import oauthRoutes from './routes/oauth.routes';
import leadsRoutes from './routes/leads.routes';
import { startScheduler } from './services/scheduler';

dotenv.config();

// Start background cron jobs
startScheduler();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/ads', adsRoutes);
app.use('/api/v1/oauth', oauthRoutes);
app.use('/api/v1/leads', leadsRoutes);

// Basic health check route
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running correctly.' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
