
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
const assignmentRoutes = require('./routes/assignmentRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const quizRoutes = require('./routes/quizRoutes');
const parentRoutes = require('./routes/parentRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const allocationRoutes = require('./routes/allocationRoutes');

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

// Running in fallback mode (no database required)

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/curriculum', courseRoutes);
app.use('/api/curriculum', assignmentRoutes);
app.use('/api/curriculum', gradeRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/allocations', allocationRoutes);
app.get('/', (req, res) => res.send('API running'));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} (SQL mode)`);
});
