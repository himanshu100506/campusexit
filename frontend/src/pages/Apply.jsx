import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { today } from '../format.js';

export default function Apply() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category_id: '', reason_detail: '', out_date: today(), in_date: today() });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/lookups').then((l) => setCategories(l.categories)).catch((e) => setError(e.message)); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const setOut = (e) => {
    const out_date = e.target.value;
    setForm({ ...form, out_date, in_date: form.in_date < out_date ? out_date : form.in_date });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/student/passes', form);
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page narrow">
      <Link to="/" className="back">Back to dashboard</Link>
      <h1>Apply for gate pass</h1>
      <form onSubmit={submit} className="form">
        <label>Name<input value={user.name} readOnly /></label>
        <label>Hostel<input value={`${user.hostel}, room ${user.room_no}`} readOnly /></label>
        <div className="row">
          <label>Out date<input type="date" min={today()} value={form.out_date} onChange={setOut} required /></label>
          <label>In date<input type="date" min={form.out_date} value={form.in_date} onChange={set('in_date')} required /></label>
        </div>
        <label>Reason to leave
          <select value={form.category_id} onChange={set('category_id')} required>
            <option value="">Choose a reason</option>
            {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
          </select>
        </label>
        <label>Details <span className="muted">(optional)</span>
          <textarea rows={3} maxLength={255} value={form.reason_detail} onChange={set('reason_detail')} placeholder="Add anything your warden should know" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
      </form>
    </main>
  );
}
