import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import PassSlip from '../components/PassSlip.jsx';

export default function Gate() {
  const [tab, setTab] = useState('expected');
  const [passes, setPasses] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setPasses(null);
    api.get(`/gate/passes?tab=${tab}`).then(setPasses).catch((e) => setError(e.message));
  }, [tab]);
  useEffect(load, [load]);

  const mark = async (id, dir) => {
    setError('');
    try { await api.post(`/gate/passes/${id}/${dir}`); load(); } catch (e) { setError(e.message); }
  };

  return (
    <main className="page">
      <h1>Gate desk</h1>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'expected'} onClick={() => setTab('expected')}>Allowed to leave</button>
        <button role="tab" aria-selected={tab === 'out'} onClick={() => setTab('out')}>Currently out</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!passes && <p className="muted">Loading…</p>}
      {passes?.length === 0 && <p className="muted">{tab === 'expected' ? 'No approved passes valid today.' : 'Nobody is out right now.'}</p>}
      <div className="slip-list">
        {passes?.map((p) => (
          <PassSlip key={p.pass_id} pass={p}>
            <p className="who"><strong>{p.student_name}</strong> · {p.roll_no} · {p.hostel_name}, room {p.room_no}</p>
            {tab === 'expected'
              ? <button className="btn small-btn" onClick={() => mark(p.pass_id, 'out')}>Mark out</button>
              : <button className="btn small-btn" onClick={() => mark(p.pass_id, 'in')}>Mark returned</button>}
          </PassSlip>
        ))}
      </div>
    </main>
  );
}
