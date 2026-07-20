import https from 'https';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import { redisConnection } from './redis';
import { initDatabaseConnections } from './db';
import authRouter from './auth/authRouter';
import qrRouter from './qr/qrRouter';
import customerLookupRouter from './customer/customerLookupRouter';
import imageUploadRouter from './image/imageUploadRouter';

function loadTlsCredentials() {
  const certPath = process.env.TLS_CERT_PATH || './certs/server.crt';
  const keyPath = process.env.TLS_KEY_PATH || './certs/server.key';

  if (!fs.existsSync(path.resolve(certPath))) {
    throw new Error(`TLS certificate not found at ${certPath}`);
  }
  if (!fs.existsSync(path.resolve(keyPath))) {
    throw new Error(`TLS key not found at ${keyPath}`);
  }

  return {
    cert: fs.readFileSync(path.resolve(certPath)),
    key: fs.readFileSync(path.resolve(keyPath))
  };
}

const app = express();
const PORT = parseInt(process.env.PORT || '8443', 10);

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api', qrRouter);
app.use('/api', customerLookupRouter);
app.use('/api', imageUploadRouter);

const tlsOptions = loadTlsCredentials();
const server = https.createServer(tlsOptions, app);

async function start() {
  try {
    await redisConnection.connect();
    console.log('Redis connected');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
  }

  try {
    await initDatabaseConnections();
    console.log('Database connections established');
  } catch (err) {
    console.error('Failed to connect to databases:', err);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`HTTPS server listening on port ${PORT}`);
  });
}

start();

export { app, server };
