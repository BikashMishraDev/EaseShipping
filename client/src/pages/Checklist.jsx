import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api.js';
import { Alert, Badge, Card, Empty, Select, Spinner, Textarea } from '../components/ui.jsx';

const kindInfo = { confirmed: ['good', 'Confirmed by a source'], recommendation: ['info', 'Recommendation'], verify: ['warn', 'Needs professional verification'] };
const statuses = [['pending', 'Pending'], ['completed', 'Completed'], ['needs_review', 'Needs review'], ['unable_to_verify', 'Unable to verify']];

function Item({ item, onSaved }) {
  const [notes, setNotes] = useState(item.notes || '');
  const [err, setErr] = useState(null);
  const patch = async (body) => { setErr(null); try { const { item: n } = await api(`/checklist/${item._id}`, { method: 'PATCH', body }); onSaved(n); } catch (e) { setErr(e.message); } };
  const [tone, label] = kindInfo[item.kind];
  return (
    <li className="rounded-md border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl"><p className="font-medium">{item.requirement}</p><p className="mt-1 text-sm text-slate">{item.explanation}</p><div className="mt-2"><Badge tone={tone}>{label}</Badge></div></div>
        <label className="text-sm"><span className="sr-only">Status for {item.requirement}</span>
          <Select value={item.status} onChange={(e) => patch({ status: e.target.value })}>{statuses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label>
      </div>
      <label className="mt-3 block text-sm"><span className="mb-1 block text-slate">Notes</span>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (item.notes || '') && patch({ notes })} /></label>
      {err && <p role="alert" className="mt-1 text-xs text-rust">{err}</p>}
    </li>
  );
}

export default function Checklist() {
  const { project } = useOutletContext();
  const [items, setItems] = useState(null);
  useEffect(() => { api(`/projects/${project._id}/checklist`).then((d) => setItems(d.items)); }, [project._id]);
  if (!items) return <Spinner />;
  if (items.length === 0) return <Empty title="No checklist yet">The checklist is created when you run an analysis on the Research tab.</Empty>;
  const done = items.filter((i) => i.status === 'completed').length;
  return (
    <div className="space-y-4">
      <Alert tone="info" title={`${done} of ${items.length} completed`}>Items marked "needs professional verification" come from a general starter list or AI suggestions and were not checked against a live official source. Nothing here is a confirmed legal requirement unless it says so.</Alert>
      <Card><ul className="space-y-3">{items.map((it) => <Item key={it._id} item={it} onSaved={(n) => setItems(items.map((x) => (x._id === n._id ? n : x)))} />)}</ul></Card>
    </div>
  );
}
