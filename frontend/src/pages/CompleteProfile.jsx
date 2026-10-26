import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function CompleteProfile() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [lookups, setLookups] = useState({ hostels: [], courses: [] });
  const [form, setForm] = useState({
    roll_no: user.roll_no || '', mobile: user.mobile || '', course_id: user.course_id || '',
    semester: user.semester || '', hostel_id: user.hostel_id || '', room_no: user.room_no || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/lookups').then(setLookups).catch((e) => setError(e.message)); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.put('/student/me/profile', form);
      await refresh();
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page narrow">
      <h1>Finish your profile</h1>
      <p className="muted">Your name and email come from Google. We need the rest once, so wardens know who and where you are.</p>
      <form onSubmit={submit} className="form">
        <label>Roll number<input value={form.roll_no} onChange={set('roll_no')} required /></label>
        <label>Mobile number<input value={form.mobile} onChange={set('mobile')} inputMode="numeric" maxLength={10} pattern="\d{10}" title="10 digits" required /></label>
        <label>Course
          <select value={form.course_id} onChange={set('course_id')} required>
            <option value="">Choose course</option>
            {lookups.courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.name}</option>)}
          </select>
        </label>
        <label>Semester
          <select value={form.semester} onChange={set('semester')} required>
            <option value="">Choose semester</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <div className="row">
          <label>Hostel
            <select value={form.hostel_id} onChange={set('hostel_id')} required>
              <option value="">Choose hostel</option>
              {lookups.hostels.map((h) => <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>)}
            </select>
          </label>
          <label>Room number<input value={form.room_no} onChange={set('room_no')} maxLength={10} required /></label>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form>
    </main>
  );
}
