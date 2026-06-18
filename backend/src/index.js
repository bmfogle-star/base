// Spark backend entrypoint.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import billingRoutes from './routes/billing.js';
import orgRoutes from './routes/org.js';

const app = express();
app.use(cors({ origin: process.env.APP_URL ? [process.env.APP_URL, /github\.io$/] : true }));

// Stripe webhook needs the raw body, so mount it BEFORE the JSON parser.
app.use('/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/ai', aiRoutes);
app.use('/billing', billingRoutes);
app.use('/orgs', orgRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Spark backend listening on :${PORT}`));
