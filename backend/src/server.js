import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { requireAuth, wrap } from './auth.js';
import authRoutes from './routes/auth.js';
import studentRoutes, { loadStudent } from './routes/student.js';
import { warden, gate } from './routes/staff.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Dropdown data for the profile and apply forms
app.get('/api/lookups', wrap(async (_req, res) => {
  const [hostels] = await pool.query('SELECT hostel_id, name FROM hostel ORDER BY name');
  const [courses] = await pool.query('SELECT course_id, name FROM course ORDER BY name');
  const [categories] = await pool.query('SELECT category_id, name FROM reason_category ORDER BY category_id');
  res.json({ hostels, courses, categories });
}));

// Who am I? Works for every role so the frontend can route after sign-in.
app.get('/api/me', requireAuth(), wrap(async (req, res) => {
  const { role, id } = req.user;
  if (role === 'student') return res.json({ role, ...(await loadStudent(id)) });
  if (role === 'warden') {
    const [[w]] = await pool.query(
      'SELECT w.name, w.email, h.name AS hostel FROM warden w JOIN hostel h ON h.hostel_id = w.hostel_id WHERE w.warden_id = ?', [id]);
    return res.json({ role, ...w });
  }
  const [[g]] = await pool.query('SELECT name, email FROM gate_staff WHERE staff_id = ?', [id]);
  res.json({ role, ...g });
}));

app.use('/api/student', studentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/warden', warden);
app.use('/api/gate', gate);

// Errors from our checks and from the database triggers (SQLSTATE 45000) become readable messages.
app.use((err, _req, res, _next) => {
  if (err.sqlState === '45000') return res.status(400).json({ error: err.sqlMessage });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`CampusExit API on http://localhost:${port}`));
