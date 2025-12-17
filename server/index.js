
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
// const mongoose = require('mongoose'); // Legacy: kept for potential rollback
const dotenv = require('dotenv');

// Load only the root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

const PORT = process.env.PORT || 4000;
// Legacy Mongo URI retained for rollback; not used in SQL mode
const MONGO_URI = process.env.MONGO_URI;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'X-Total-Count'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Staff-Id', 'X-Staff-Token', 'X-Requested-With'],
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// SQL Mode: verify Postgres connectivity at startup
const { pool } = require('./db/sql');
pool.query('SELECT 1').then(() => {
  console.log('Connected to Supabase Postgres');
}).catch((err) => {
  console.error('Failed to connect to Supabase Postgres', err.message || err);
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/curriculum', courseRoutes);
app.use('/api/admission', applicationRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} (SQL mode)`);
});
