/**
 * Author: Igor Michel
 * Purpose: Express app entry point for LPODesk backend API.
 * Last updated: 2026-03-11
 */
import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import pool from './db/pool.js';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requestRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import usersRoutes from './routes/users.js';
import delegationsRoutes from './routes/delegations.js';
import profileRoutes from './routes/profile.js';
const app = express();
const PORT = process.env.PORT || 4000;
const startTime = Date.now();

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || corsOrigins.includes(origin)) return cb(null, origin || corsOrigins[0]);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/requests', approvalRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/delegations', delegationsRoutes);
app.get('/', (_, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html>
      <head><title>LPODesk API</title></head>
      <body style="font-family: system-ui; padding: 2rem;">
        <h1>LPODesk API</h1>
        <p>Backend is running. Use the frontend app to sign in.</p>
        <ul>
          <li><a href="/api/health">Health check</a> (JSON)</li>
          <li><a href="/api/troubleshoot">Troubleshoot</a> (JSON)</li>
          <li><a href="http://localhost:5173">Open frontend (localhost:5173)</a></li>
        </ul>
      </body>
    </html>
  `);
});
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.get('/api/troubleshoot', async (_, res) => {
  const out = {
    ok: true,
    backend: 'running',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    env: {
      DATABASE_URL_set: !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim()),
      JWT_SECRET_set: !!(process.env.JWT_SECRET && String(process.env.JWT_SECRET).trim()),
      PORT: process.env.PORT || 5000,
    },
    database: { connected: false, error: null },
  };
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    out.database = { connected: true, error: null };
  } catch (err) {
    out.ok = false;
    out.database = { connected: false, error: err.message || String(err) };
  }
  res.json(out);
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message || err);
  if (err.stack) console.error(err.stack);
  if (res.headersSent) return next(err);
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error');
  res.status(500).json({ error: message });
});

const HOST = process.env.HOST || '127.0.0.1';
const server = app.listen(PORT, HOST, () => {
  console.log(`LPODesk API running on http://${HOST}:${PORT}`);
  const hasDb = !!process.env.DATABASE_URL;
  const hasJwt = !!(process.env.JWT_SECRET && String(process.env.JWT_SECRET).trim());
  if (!hasDb) console.warn('WARN: DATABASE_URL is not set');
  if (!hasJwt) console.warn('WARN: JWT_SECRET is not set — login will fail');
  if (hasDb && hasJwt) console.log('Env OK: DATABASE_URL and JWT_SECRET set');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n ERROR: Port ${PORT} is already in use.`);
    console.error(` Run: netstat -ano | findstr :${PORT}  — to find and kill the conflicting process.\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
