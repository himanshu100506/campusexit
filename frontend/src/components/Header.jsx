import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Header() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const home = user.role === 'student' ? '/' : `/${user.role}`;

  return (
    <header className="topbar">
      <Link to={home} className="brand">CampusExit</Link>
      <div className="profile-wrap" ref={box}>
        <button className="profile-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Open profile">
          <span className="avatar">{initials}</span>
          <span className="profile-name">{user.name}</span>
        </button>
        {open && (
          <div className="profile-pop">
            <p className="pop-name">{user.name}</p>
            <p className="muted">{user.email}</p>
            {user.role === 'student' && (
              <dl>
                <dt>Roll no.</dt><dd>{user.roll_no}</dd>
                <dt>Course</dt><dd>{user.course}</dd>
                <dt>Semester</dt><dd>{user.semester}</dd>
                <dt>Hostel</dt><dd>{user.hostel}, room {user.room_no}</dd>
              </dl>
            )}
            {user.role === 'warden' && <dl><dt>Hostel</dt><dd>{user.hostel}</dd></dl>}
            <button className="btn ghost" onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
