import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const hasGoogle = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async (promise) => {
    setError('');
    setBusy(true);
    try {
      const { token } = await promise;
      await signIn(token);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <section className="login-hero">
        <h1>CampusExit</h1>
        <p>Apply for your gate pass from your phone. No notebook, no queue at the warden's desk.</p>
        <div className="slip hero-slip" aria-hidden="true">
          <div className="slip-main">
            <div className="slip-top"><h3>Going home</h3><span className="muted">Pass #1042</span></div>
            <p className="slip-dates">Fri 24 Oct to Sun 26 Oct</p>
          </div>
          <div className="slip-stub"><span className="stamp">Approved</span></div>
        </div>
      </section>

      <section className="login-card">
        <h2>Sign in</h2>
        <p className="muted">Use your college Google account.</p>

        {hasGoogle ? (
          <GoogleLogin
            onSuccess={(r) => finish(api.post('/auth/google', { credential: r.credential }))}
            onError={() => setError('Google sign-in failed. Try again.')}
            text="signin_with"
          />
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); finish(api.post('/auth/dev', { email })); }}>
            <p className="notice">Google sign-in is not set up yet. Using test sign-in.</p>
            <label>College email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@chitkara.edu.in" required />
            </label>
            <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
