import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fieldErrors } from '../services/api.js';
import { Alert, Button, Card, PageHeader } from '../components/ui.jsx';
import { PackagingSection, ProductSection, ShipmentSection, emptyProject, toPayload } from './ProjectForm.jsx';

const steps = ['Product', 'Shipment', 'Packaging'];

export default function NewProject() {
  const [f, setF] = useState(emptyProject);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const set = (patch) => setF((s) => ({ ...s, ...patch }));

  const save = async () => {
    if (!f.name.trim()) { setErrors({ name: 'Give the project a name' }); setStep(0); return; }
    setBusy(true); setMsg(null); setErrors({});
    try {
      const { project } = await api('/projects', { method: 'POST', body: toPayload(f) });
      nav(`/app/projects/${project._id}`);
    } catch (e) {
      setErrors(fieldErrors(e)); setMsg(e.message);
      const keys = Object.keys(fieldErrors(e));
      if (keys.some((k) => ['declaredValue', 'currency', 'quantity', 'weightKg', 'originCountry', 'destinationCountry'].includes(k))) setStep(1);
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="New export project">You can save at any step and finish later. Required details are only needed before running research.</PageHeader>
      <ol className="mb-5 flex gap-2 text-sm" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s}><button onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined} className={`rounded-md px-3 py-1.5 ${i === step ? 'bg-harbor text-white' : 'bg-white text-slate border border-line'}`}>{i + 1}. {s}</button></li>
        ))}
      </ol>
      {msg && <div className="mb-4"><Alert tone="bad" title="Could not save">{msg}</Alert></div>}
      <Card>
        {step === 0 && <ProductSection f={f} set={set} errors={errors} />}
        {step === 1 && <ShipmentSection f={f} set={set} errors={errors} />}
        {step === 2 && <PackagingSection f={f} set={set} />}
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          <div className="flex gap-2">
            <Button variant="secondary" busy={busy} onClick={save}>Save draft</Button>
            {step < 2 ? <Button onClick={() => setStep(step + 1)}>Next</Button> : <Button busy={busy} onClick={save}>Create project</Button>}
          </div>
        </div>
      </Card>
    </>
  );
}
