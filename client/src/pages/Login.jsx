import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Anchor } from 'lucide-react';
import { BASE, api, setCsrf } from '../services/api.js';
import { useAuth } from '../context/Auth.jsx';
import { Alert, Button, Spinner } from '../components/ui.jsx';

const messages = {
  google_not_configured: 'Google sign-in is not set up on this server yet. Add the Google OAuth keys to the server .env file.',
  meta_not_configured: 'Meta sign-in is not set up on this server yet. Add the Meta app keys to the server .env file.',
  access_denied: 'Sign-in was cancelled.',
  invalid_state: 'The sign-in session expired or did not match. Please try again.',
  login_failed: 'Sign-in could not be completed. Please try again.',
};

export default function Login() {
  const { user, loading, refresh } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const err = params.get('error');
  useEffect(() => { api('/system/status').then(setStatus).catch(() => setStatus(false)); }, []);
  const { state } = useLocation();

  if (loading) return <Spinner label="Checking your session" />;
  if (user) return <Navigate to={state?.from?.startsWith('/app') ? state.from : '/app'} replace />;

  const devLogin = async () => {
    setBusy(true);
    try { const r = await api('/auth/dev-login', { method: 'POST', body: { name: 'Demo User' } }); setCsrf(r.csrfToken); await refresh(); nav('/app'); }
    finally { setBusy(false); }
  };
  const Provider = ({ name, href, ok }) => (
    <div>
      <a href={ok === false ? undefined : href} aria-disabled={ok === false}
        className={`flex w-full items-center justify-center rounded-md border px-4 py-2.5 text-sm font-medium ${ok === false ? 'cursor-not-allowed border-line bg-mist text-slate' : 'border-line bg-white hover:bg-mist'}`}>
        Continue with {name}
      </a>
      {ok === false && <p className="mt-1 text-xs text-slate">Not configured on this server.</p>}
    </div>
  );
  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-7">
        <Link to="/" className="mb-5 flex items-center gap-2 font-semibold"><Anchor className="h-5 w-5 text-harbor" aria-hidden />EaseShipping</Link>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-slate">Use your Google or Meta account. We only ask for your name and email.</p>
        {err && <div className="mt-4"><Alert tone="bad" title="Could not sign in">{messages[err] || 'Something went wrong.'}</Alert></div>}
        {status === false && <div className="mt-4"><Alert tone="bad" title="Server unreachable">Start the API server and refresh this page.</Alert></div>}
        <div className="mt-5 space-y-3">
          <Provider name="Google" href={`${BASE}/api/v1/auth/google`} ok={status ? status.google : undefined} />
          <Provider name="Meta" href={`${BASE}/api/v1/auth/meta`} ok={status ? status.meta : undefined} />
          {status?.devLogin && <Button variant="secondary" className="w-full" busy={busy} onClick={devLogin}>Continue as demo user (local only)</Button>}
        </div>
      </div>
    </div>
  );
}
