import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api, fieldErrors } from '../services/api.js';
import { Alert, Button, Card } from '../components/ui.jsx';
import { PackagingSection, ProductSection, ShipmentSection, fromProject, toPayload } from './ProjectForm.jsx';

export default function Overview() {
  const { project, setProject } = useOutletContext();
  const [f, setF] = useState(fromProject(project));
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const set = (patch) => setF((s) => ({ ...s, ...patch }));

  const save = async () => {
    setBusy(true); setMsg(null); setErrors({});
    try { const { project: p } = await api(`/projects/${project._id}`, { method: 'PATCH', body: toPayload(f) }); setProject(p); setF(fromProject(p)); setMsg({ tone: 'good', text: 'Saved.' }); }
    catch (e) { setErrors(fieldErrors(e)); setMsg({ tone: 'bad', text: e.message }); }
    finally { setBusy(false); }
  };
  const archive = async () => { const { project: p } = await api(`/projects/${project._id}/archive`, { method: 'POST', body: { archived: !project.archivedAt } }); setProject(p); };
  const del = async () => {
    if (!window.confirm('Delete this project, its documents, reports and checklist? This cannot be undone.')) return;
    await api(`/projects/${project._id}`, { method: 'DELETE' }); nav('/app/projects');
  };

  return (
    <div className="space-y-4">
      {project.missing.required.length > 0 && <Alert tone="warn" title="Details needed before research can run">Add: {project.missing.required.map((m) => m.label).join(', ')}.</Alert>}
      {project.missing.required.length === 0 && project.missing.recommended.length > 0 && <Alert tone="info" title="Optional details that improve results">{project.missing.recommended.map((m) => m.label).join(', ')}.</Alert>}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Card title="Product"><ProductSection f={f} set={set} errors={errors} /></Card>
      <Card title="Shipment"><ShipmentSection f={f} set={set} errors={errors} /></Card>
      <Card title="Packaging"><PackagingSection f={f} set={set} /></Card>
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2"><Button variant="secondary" onClick={archive}>{project.archivedAt ? 'Restore project' : 'Archive project'}</Button><Button variant="danger" onClick={del}>Delete project</Button></div>
        <Button busy={busy} onClick={save}>Save changes</Button>
      </div>
    </div>
  );
}
