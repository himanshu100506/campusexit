import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import PassSlip from '../components/PassSlip.jsx';

const LIVE = ['PENDING', 'APPROVED', 'OUT'];

export default function Dashboard() {
  const { user } = useAuth();
  const [passes, setPasses] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/student/passes/mine').then(setPasses).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const cancel = async (id) => {
    setError('');
    try { await api.patch(`/student/passes/${id}/cancel`); load(); } catch (e) { setError(e.message); }
  };

  const live = passes?.find((p) => LIVE.includes(p.status));
  const firstName = user.name.split(' ')[0];

  return (
    <main className="page">
      <h1>Hi, {firstName}</h1>
      <p className="muted">{user.hostel}, room {user.room_no}</p>

      <section className="apply-box">
        {live ? (
          <>
            <h2>You have a pass in progress</h2>
            <p className="muted">You can apply again once it is returned, rejected or cancelled.</p>
          </>
        ) : (
          <>
            <h2>Need to leave campus?</h2>
            <p className="muted">Tell us when you are going and why. Your warden will approve it.</p>
            <Link to="/apply" className="btn">Apply for gate pass</Link>
          </>
        )}
      </section>

      <section>
        <h2>Previous gate passes</h2>
        {error && <p className="error" role="alert">{error}</p>}
        {!passes && !error && <p className="muted">Loading…</p>}
        {passes?.length === 0 && <p className="muted">No passes yet. Your applications will show up here.</p>}
        <div className="slip-list">
          {passes?.map((p) => (
            <PassSlip key={p.pass_id} pass={p}>
              {p.status === 'PENDING' && <button className="btn ghost small-btn" onClick={() => cancel(p.pass_id)}>Cancel request</button>}
            </PassSlip>
          ))}
        </div>
      </section>
    </main>
  );
}
