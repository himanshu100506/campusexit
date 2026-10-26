import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, requireAuth, wrap } from '../auth.js';

const router = Router();
router.use(requireAuth('student'));

const PROFILE_SQL = `
  SELECT s.student_id, s.email, s.name, s.roll_no, s.mobile, s.semester,
         c.course_id, c.name AS course, h.hostel_id, h.name AS hostel, r.room_no
    FROM student s
    LEFT JOIN course c ON c.course_id = s.course_id
    LEFT JOIN room r   ON r.room_id = s.room_id
    LEFT JOIN hostel h ON h.hostel_id = r.hostel_id
   WHERE s.student_id = ?`;

export async function loadStudent(id) {
  const [[row]] = await pool.query(PROFILE_SQL, [id]);
  if (!row) throw new HttpError(404, 'Student not found.');
  row.profileComplete = Boolean(row.roll_no && row.mobile && row.course_id && row.semester && row.room_no);
  return row;
}

router.put('/me/profile', wrap(async (req, res) => {
  const { roll_no, mobile, course_id, semester, hostel_id, room_no } = req.body;
  const roll = String(roll_no || '').trim();
  const room = String(room_no || '').trim();
  const sem = Number(semester);

  if (!roll) throw new HttpError(400, 'Enter your roll number.');
  if (!/^\d{10}$/.test(String(mobile || ''))) throw new HttpError(400, 'Mobile number must be 10 digits.');
  if (!Number.isInteger(sem) || sem < 1 || sem > 12) throw new HttpError(400, 'Semester must be between 1 and 12.');
  if (!course_id || !hostel_id) throw new HttpError(400, 'Choose your course and hostel.');
  if (!room || room.length > 10) throw new HttpError(400, 'Enter your room number.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('INSERT IGNORE INTO room (hostel_id, room_no) VALUES (?, ?)', [hostel_id, room]);
    const [[roomRow]] = await conn.query('SELECT room_id FROM room WHERE hostel_id = ? AND room_no = ?', [hostel_id, room]);
    await conn.query(
      `UPDATE student SET roll_no = ?, mobile = ?, course_id = ?, semester = ?, room_id = ? WHERE student_id = ?`,
      [roll, mobile, course_id, sem, roomRow.room_id, req.user.id],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'That roll number is already registered.');
    if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new HttpError(400, 'Choose a valid course and hostel.');
    throw err;
  } finally {
    conn.release();
  }
  res.json(await loadStudent(req.user.id));
}));

router.post('/passes', wrap(async (req, res) => {
  const { category_id, reason_detail, out_date, in_date } = req.body;
  if (!category_id) throw new HttpError(400, 'Choose a reason for leaving.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out_date || '') || !/^\d{4}-\d{2}-\d{2}$/.test(in_date || '')) {
    throw new HttpError(400, 'Enter valid out and in dates.');
  }
  if (in_date < out_date) throw new HttpError(400, 'In date cannot be before out date.');
  const detail = String(reason_detail || '').trim().slice(0, 255) || null;

  // The trigger trg_pass_before_insert enforces: room set, no past dates, one live pass.
  const [result] = await pool.query(
    'INSERT INTO gate_pass (student_id, category_id, reason_detail, out_date, in_date) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, category_id, detail, out_date, in_date],
  );
  res.status(201).json({ pass_id: result.insertId });
}));

router.get('/passes/mine', wrap(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM v_pass_details WHERE student_id = ? ORDER BY applied_at DESC, pass_id DESC',
    [req.user.id],
  );
  res.json(rows);
}));

router.patch('/passes/:id/cancel', wrap(async (req, res) => {
  const [result] = await pool.query(
    `UPDATE gate_pass SET status = 'CANCELLED' WHERE pass_id = ? AND student_id = ? AND status = 'PENDING'`,
    [req.params.id, req.user.id],
  );
  if (!result.affectedRows) throw new HttpError(400, 'Only pending passes can be cancelled.');
  res.json({ ok: true });
}));

export default router;
