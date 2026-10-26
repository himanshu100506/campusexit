import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Header from './components/Header.jsx';
import Login from './pages/Login.jsx';
import CompleteProfile from './pages/CompleteProfile.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Apply from './pages/Apply.jsx';
import Warden from './pages/Warden.jsx';
import Gate from './pages/Gate.jsx';

const HOME = { student: '/', warden: '/warden', gate: '/gate' };

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-note">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={HOME[user.role]} replace />;
  if (role === 'student' && !user.profileComplete) return <Navigate to="/complete-profile" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      {user && <Header />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to={HOME[user.role]} replace /> : <Login />} />
        <Route path="/complete-profile" element={user?.role === 'student' ? <CompleteProfile /> : <Navigate to="/login" replace />} />
        <Route path="/" element={<Guard role="student"><Dashboard /></Guard>} />
        <Route path="/apply" element={<Guard role="student"><Apply /></Guard>} />
        <Route path="/warden" element={<Guard role="warden"><Warden /></Guard>} />
        <Route path="/gate" element={<Guard role="gate"><Gate /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
