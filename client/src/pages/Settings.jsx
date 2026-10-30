import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/Auth.jsx';
import { Alert, Badge, Button, Card, Field, Input, PageHeader } from '../components/ui.jsx';

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user.name || '');
  const [msg, setMsg] = useState(null);
  const [status, setStatus] = useState(null);
  useEffect(() => { api('/system/status').then(setStatus).catch(() => {}); }, []);
  const save = async () => { try { await api('/account', { method: 'PATCH', body: { name } }); await refresh(); setMsg({ tone: 'good', text: 'Saved.' }); } catch (e) { setMsg({ tone: 'bad', text: e.message }); } };
  const del = async () => {
    if (!window.confirm('Delete your account and all projects, documents and reports? This cannot be undone.')) return;
    await api('/account', { method: 'DELETE' }); await refresh();
  };
  return (
    <>
      <PageHeader title="Account settings" />
      <div className="space-y-4">
        <Card title="Profile">
          {msg && <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
          <div className="max-w-sm space-y-3">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <p className="text-sm text-slate">Email: {user.email || 'not provided by your sign-in provider'}{user.email && !user.emailVerified && ' (not verified by the provider)'}</p>
            <p className="text-sm text-slate">Signed in with: {user.providers.join(', ')}</p>
            <Button onClick={save}>Save</Button>
          </div>
        </Card>
        <Card title="Service status">
          {!status ? <p className="text-sm text-slate">Checking…</p> : (
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Badge tone={status.ai.configured ? 'good' : 'warn'}>{status.ai.configured ? 'Connected' : 'Not configured'}</Badge>AI analysis: {status.ai.provider}, model {status.ai.model}</li>
              <li className="flex items-center gap-2"><Badge tone={status.google ? 'good' : 'neutral'}>{status.google ? 'On' : 'Off'}</Badge>Google sign-in</li>
              <li className="flex items-center gap-2"><Badge tone={status.meta ? 'good' : 'neutral'}>{status.meta ? 'On' : 'Off'}</Badge>Meta sign-in</li>
              <li className="flex items-center gap-2"><Badge>Off</Badge>OCR for scanned documents</li>
            </ul>)}
        </Card>
        <Card title="Delete account"><p className="mb-3 text-sm text-slate">Removes your profile, projects, uploaded documents, reports and checklists.</p><Button variant="danger" onClick={del}>Delete my account</Button></Card>
      </div>
    </>
  );
}
