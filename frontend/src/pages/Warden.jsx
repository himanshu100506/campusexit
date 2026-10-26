import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import PassSlip from '../components/PassSlip.jsx';

export default function Warden() {
  const [tab, setTab] = useState('PENDING');
  const [passes, setPasses] = useState(null);
  const [remarks, setRemarks] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setPasses(null);
    api.get(`/warden/passes?status=${tab}`).then(setPasses).catch((e) => setError(e.message));
  }, [tab]);
  useEffect(load, [load]);

  const review = async (id, decision) => {
    setError('');
    try {
      await api.post(`/warden/passes/${id}/review`, { decision, remarks: remarks[id] });
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <main className="page">
      <h1>Gate pass requests</h1>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'PENDING'} onClick={() => setTab('PENDING')}>Waiting for you</button>
        <button role="tab" aria-selected={tab === 'ALL'} onClick={() => setTab('ALL')}>All requests</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!passes && <p className="muted">Loading…</p>}
      {passes?.length === 0 && <p className="muted">{tab === 'PENDING' ? 'Nothing waiting. New requests appear here.' : 'No requests yet.'}</p>}
      <div className="slip-list">
        {passes?.map((p) => (
          <PassSlip key={p.pass_id} pass={p}>
            <p className="who"><strong>{p.student_name}</strong> · {p.roll_no} · room {p.room_no} · {p.mobile}</p>
            {p.status === 'PENDING' && (
              <div className="review">
                <input placeholder="Remarks (optional)" value={remarks[p.pass_id] || ''} maxLength={255}
                  onChange={(e) => setRemarks({ ...remarks, [p.pass_id]: e.target.value })} />
                <button className="btn small-btn" onClick={() => review(p.pass_id, 'APPROVED')}>Approve</button>
                <button className="btn ghost small-btn" onClick={() => review(p.pass_id, 'REJECTED')}>Reject</button>
              </div>
            )}
          </PassSlip>
        ))}
      </div>
    </main>
  );
}
