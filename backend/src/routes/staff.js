import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, requireAuth, wrap } from '../auth.js';

export const warden = Router();
warden.use(requireAuth('warden'));

warden.get('/passes', wrap(async (req, res) => {
  const [[w]] = await pool.query('SELECT hostel_id FROM warden WHERE warden_id = ?', [req.user.id]);
  const status = req.query.status === 'ALL' ? null : 'PENDING';
  const [rows] = await pool.query(
    `SELECT * FROM v_pass_details WHERE hostel_id = ? ${status ? 'AND status = ?' : ''}
      ORDER BY applied_at DESC LIMIT 200`,
    status ? [w.hostel_id, status] : [w.hostel_id],
  );
  res.json(rows);
}));

warden.post('/passes/:id/review', wrap(async (req, res) => {
  const decision = req.body.decision;
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new HttpError(400, 'Choose approve or reject.');
  const remarks = String(req.body.remarks || '').trim().slice(0, 255) || null;
  await pool.query('CALL sp_review_pass(?, ?, ?, ?)', [req.params.id, req.user.id, decision, remarks]);
  res.json({ ok: true });
}));

export const gate = Router();
gate.use(requireAuth('gate'));

gate.get('/passes', wrap(async (req, res) => {
  const sql = req.query.tab === 'out'
    ? `SELECT * FROM v_pass_details WHERE status = 'OUT' ORDER BY out_time`
    : `SELECT * FROM v_pass_details WHERE status = 'APPROVED' AND out_date <= CURDATE() ORDER BY out_date`;
  const [rows] = await pool.query(sql);
  res.json(rows);
}));

gate.post('/passes/:id/out', wrap(async (req, res) => {
  await pool.query('CALL sp_mark_out(?, ?)', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

gate.post('/passes/:id/in', wrap(async (req, res) => {
  await pool.query('CALL sp_mark_in(?, ?)', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));
