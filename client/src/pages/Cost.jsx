import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { api, fieldErrors } from '../services/api.js';
import { Alert, Button, Card, Field, Input, Select, Spinner } from '../components/ui.jsx';
import { CostTable } from './ReportParts.jsx';

function Rows({ title, rows, setRows, cols, blank, hint }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between"><p className="text-sm font-medium">{title}</p><Button variant="quiet" onClick={() => setRows([...rows, blank])}><Plus className="h-4 w-4" aria-hidden />Add</Button></div>
      {hint && <p className="mb-2 text-xs text-slate">{hint}</p>}
      {rows.map((r, i) => (
        <div key={i} className="mb-2 flex flex-wrap items-end gap-2">
          {cols.map((c) => (
            <label key={c.key} className="text-xs"><span className="mb-0.5 block text-slate">{c.label}</span>
              {c.options ? <Select value={r[c.key]} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [c.key]: e.target.value } : x)))}>{c.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                : <Input className={c.w || 'w-32'} value={r[c.key] ?? ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [c.key]: e.target.value } : x)))} />}
            </label>
          ))}
          <Button variant="quiet" aria-label={`Remove ${title} row`} onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" aria-hidden /></Button>
        </div>
      ))}
    </div>
  );
}

export default function Cost() {
  const { project } = useOutletContext();
  const [data, setData] = useState(null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [errors, setErrors] = useState({});

  const hydrate = (d) => {
    const i = d.inputs || {};
    setData(d);
    setF({
      freight: i.freight ?? '', insurance: i.insurance ?? '',
      fx: { rate: i.fx?.rate ?? '', source: i.fx?.source ?? '', date: i.fx?.date ?? '' },
      dutyPercent: i.dutyOverride?.percent ?? '', dutySource: i.dutyOverride?.source ?? '',
      additionalDuties: (i.additionalDuties || []).map((x) => ({ ...x, source: x.source ?? '' })),
      taxes: (i.taxes || []).map((x) => ({ ...x, source: x.source ?? '' })),
      fees: i.fees || [],
    });
  };
  useEffect(() => { api(`/projects/${project._id}/cost`).then(hydrate).catch((e) => setErr(e.message)); }, [project._id]);

  const save = async () => {
    setBusy(true); setErr(null); setErrors({});
    const body = {
      freight: f.freight || null, insurance: f.insurance || null,
      fx: project.currency !== 'USD' && f.fx.rate ? f.fx : null,
      dutyOverride: f.dutyPercent ? { percent: f.dutyPercent, source: f.dutySource } : null,
      additionalDuties: f.additionalDuties.map((x) => ({ ...x, source: x.source || null })),
      taxes: f.taxes.map((x) => ({ ...x, source: x.source || null })),
      fees: f.fees,
    };
    try { hydrate(await api(`/projects/${project._id}/cost`, { method: 'PUT', body })); }
    catch (e) { setErr(e.message); setErrors(fieldErrors(e)); } finally { setBusy(false); }
  };
  if (err && !data) return <Alert tone="bad">{err}</Alert>;
  if (!data) return <Spinner />;
  const sel = data.selectedClassification;
  const set = (patch) => setF({ ...f, ...patch });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <Card title="Inputs">
          <p className="mb-4 text-sm text-slate">Value, quantity and currency come from the project ({project.declaredValue ? `${project.declaredValue} ${project.currency}` : 'value missing'}, {project.quantity ?? 'quantity missing'} units). Leave a field blank if you do not know it; it will be listed as missing.</p>
          {err && <div className="mb-3"><Alert tone="bad" title="Check your inputs">{err}</Alert></div>}
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={`International freight (${project.currency})`} error={errors.freight}><Input inputMode="decimal" value={f.freight} onChange={(e) => set({ freight: e.target.value })} /></Field>
            <Field label={`Insurance (${project.currency})`} error={errors.insurance}><Input inputMode="decimal" value={f.insurance} onChange={(e) => set({ insurance: e.target.value })} /></Field>
          </div>
          {project.currency !== 'USD' && (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label={`USD per 1 ${project.currency}`} hint="Rate you looked up"><Input value={f.fx.rate} onChange={(e) => set({ fx: { ...f.fx, rate: e.target.value } })} /></Field>
              <Field label="Rate source"><Input value={f.fx.source} onChange={(e) => set({ fx: { ...f.fx, source: e.target.value } })} /></Field>
              <Field label="Rate date"><Input value={f.fx.date} placeholder="YYYY-MM-DD" onChange={(e) => set({ fx: { ...f.fx, date: e.target.value } })} /></Field>
            </div>
          )}
          <div className="mt-4 rounded-md bg-mist p-3 text-sm">
            <p className="font-medium">Customs duty rate</p>
            {sel ? <p className="text-slate">Using HTS {sel.htsno} general rate "{sel.generalRate || 'n/a'}" from the USITC schedule unless you enter a rate below. Specific or compound rates cannot be calculated automatically.</p>
              : <p className="text-slate">No classification selected. Choose one on the Research tab, or enter a rate you have verified.</p>}
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <Field label="Override rate (%)" error={errors.dutyOverride}><Input value={f.dutyPercent} onChange={(e) => set({ dutyPercent: e.target.value })} /></Field>
              <Field label="Source of override"><Input value={f.dutySource} onChange={(e) => set({ dutySource: e.target.value })} placeholder="e.g. broker quote 12 Oct" /></Field>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <Rows title="Additional duties" hint="Extra tariff programs you have verified. Percent of customs value." rows={f.additionalDuties} setRows={(r) => set({ additionalDuties: r })} blank={{ label: '', percent: '', source: '' }} cols={[{ key: 'label', label: 'Name', w: 'w-36' }, { key: 'percent', label: '%', w: 'w-20' }, { key: 'source', label: 'Source', w: 'w-36' }]} />
            <Rows title="Taxes" rows={f.taxes} setRows={(r) => set({ taxes: r })} blank={{ label: '', percent: '', base: 'customs_value', source: '' }} cols={[{ key: 'label', label: 'Name', w: 'w-32' }, { key: 'percent', label: '%', w: 'w-20' }, { key: 'base', label: 'Applied to', options: [['customs_value', 'Customs value'], ['customs_value_plus_duty', 'Value + duty']] }, { key: 'source', label: 'Source', w: 'w-32' }]} />
            <Rows title="Other fees" hint={`Flat amounts in ${project.currency}, e.g. broker fee or MPF if you know it.`} rows={f.fees} setRows={(r) => set({ fees: r })} blank={{ label: '', amount: '' }} cols={[{ key: 'label', label: 'Name', w: 'w-40' }, { key: 'amount', label: 'Amount', w: 'w-28' }]} />
          </div>
          <Button className="mt-5" busy={busy} onClick={save}>Calculate</Button>
        </Card>
      </div>
      <Card title="Estimate"><CostTable cost={data.estimate} /></Card>
    </div>
  );
}
