import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Alert, Badge, Card, Empty, PageHeader, Spinner, fmtDate, statusTone } from '../components/ui.jsx';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api('/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Alert tone="bad" title="Could not load the dashboard">{err}</Alert>;
  if (!d) return <Spinner />;
  if (d.totalProjects === 0) return (
    <>
      <PageHeader title="Dashboard" />
      <Empty title="Create your first export project" action={<Link to="/app/projects/new" className="rounded-md bg-harbor px-4 py-2 text-sm font-medium text-white hover:bg-harbor-dark">Start a project</Link>}>
        Describe a product, upload an invoice and get candidate tariff codes, a cost estimate and a checklist for shipping from India to the US.
      </Empty>
    </>
  );
  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Export projects"><p className="text-3xl font-semibold">{d.totalProjects}</p></Card>
        <Card title="Need attention"><p className="text-3xl font-semibold">{d.needsAttention.length}</p>
          <ul className="mt-2 space-y-1 text-sm">{d.needsAttention.slice(0, 3).map((p) => <li key={p.id}><Link className="text-harbor underline" to={`/app/projects/${p.id}`}>{p.name}</Link> <span className="text-slate">{p.reason}</span></li>)}</ul></Card>
        <Card title="Open checklist items"><p className="text-3xl font-semibold">{d.incompleteChecklists.reduce((s, c) => s + c.open, 0)}</p>
          <ul className="mt-2 space-y-1 text-sm">{d.incompleteChecklists.slice(0, 3).map((c) => <li key={c.projectId}><Link className="text-harbor underline" to={`/app/projects/${c.projectId}/checklist`}>{c.projectName}</Link> <span className="text-slate">{c.open} open</span></li>)}</ul></Card>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Recent reports">
          {d.recentReports.length === 0 ? <p className="text-sm text-slate">No reports yet. Run an analysis from a project's Research tab.</p> :
            <ul className="divide-y divide-line text-sm">{d.recentReports.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2"><Link className="text-harbor underline" to={`/app/projects/${r.projectId}/reports/${r.id}`}>{r.projectName}</Link><span className="flex items-center gap-2"><Badge tone={statusTone[r.status]}>{r.status}</Badge><span className="text-slate">{fmtDate(r.createdAt)}</span></span></li>))}</ul>}
        </Card>
        <Card title="Recent activity">
          {d.recentActivity.length === 0 ? <p className="text-sm text-slate">Nothing yet.</p> :
            <ul className="space-y-2 text-sm">{d.recentActivity.map((e) => <li key={e.id} className="flex justify-between gap-3"><span>{e.message}</span><span className="shrink-0 text-slate">{fmtDate(e.createdAt)}</span></li>)}</ul>}
        </Card>
      </div>
    </>
  );
}
