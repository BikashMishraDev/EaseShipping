import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Download, Printer } from 'lucide-react';
import { api, BASE } from '../services/api.js';
import { Alert, Badge, Button, Card, Spinner, fmtDate, statusTone } from '../components/ui.jsx';
import { ClassificationCard, CostTable, Stages } from './ReportParts.jsx';

export default function ReportView() {
  const { reportId } = useParams();
  const { project } = useOutletContext();
  const [report, setReport] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api(`/reports/${reportId}`).then((d) => setReport(d.report)).catch((e) => setErr(e.message));
    api(`/projects/${project._id}/checklist`).then((d) => setItems(d.items)).catch(() => {});
  }, [reportId, project._id]);
  if (err) return <Alert tone="bad" title="Report not found">{err}</Alert>;
  if (!report) return <Spinner />;
  const s = report.productSnapshot || {};
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link to=".." relative="path" className="text-sm text-slate hover:text-ink">All reports</Link>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />Print</Button>
          <a href={`${BASE}/api/v1/reports/${report._id}/pdf`} className="inline-flex items-center gap-2 rounded-md bg-harbor px-3.5 py-2 text-sm font-medium text-white hover:bg-harbor-dark"><Download className="h-4 w-4" aria-hidden />Download PDF</a>
        </div>
      </div>
      <Card>
        <h2 className="text-xl font-semibold">Export readiness report: {project.name}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate">{report.corridor} | {fmtDate(report.createdAt)} <Badge tone={statusTone[report.status]}>{report.status}</Badge> <Badge tone="warn">Draft for review</Badge></p>
        <p className="mt-3 text-xs text-rust">Research assistance only. Not a customs determination, legal advice or a guarantee of compliance.</p>
      </Card>
      <Card title="Product and shipment">
        <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          {[['Description', s.description], ['Category', s.category], ['Materials', [...(s.materials || []), ...(s.ingredients || [])].join(', ')], ['Declared value', s.declaredValue && `${s.declaredValue} ${s.currency}`], ['Quantity', s.quantity], ['Weight', s.weightKg && `${s.weightKg} kg`], ['Packaging', s.packaging?.type]].map(([k, v]) => (
            <div key={k}><dt className="text-slate">{k}</dt><dd>{v || <span className="text-slate">Not provided</span>}</dd></div>))}
        </dl>
      </Card>
      <Card title="Summary"><ul className="list-disc space-y-1 pl-5 text-sm">{report.summary.map((t, i) => <li key={i}>{t}</li>)}</ul></Card>
      <Card title="Candidate classifications">
        {report.classifications.length === 0 ? <p className="text-sm text-slate">None suggested for this report.</p> : <div className="space-y-3">{report.classifications.map((c) => <ClassificationCard key={c.htsno} c={c} sources={report.sources} />)}</div>}
      </Card>
      <Card title="Landed cost estimate"><CostTable cost={report.cost} /></Card>
      <Card title="Compliance checklist">
        <ul className="space-y-2 text-sm">{items.map((i) => <li key={i._id}><span className="font-medium">[{i.status.replace('_', ' ')}]</span> {i.requirement} <span className="text-slate">({i.kind === 'verify' ? 'needs professional verification' : i.kind})</span>{i.notes && <p className="text-slate">Notes: {i.notes}</p>}</li>)}</ul>
      </Card>
      {(report.missingInfo.length > 0 || report.conflicts.length > 0) && (
        <Card title="Missing information and conflicts"><ul className="list-disc space-y-1 pl-5 text-sm">
          {report.missingInfo.map((m, i) => <li key={`m${i}`}>{m.label} <span className="text-slate">({m.severity.replace('_', ' ')})</span></li>)}
          {report.conflicts.map((c, i) => <li key={`c${i}`}>{c.label}: project "{c.projectValue}" vs {c.document} "{c.documentValue}"</li>)}</ul></Card>
      )}
      <Card title="How this report was produced"><Stages stages={report.stages} /></Card>
      <Card title="Recommended next steps"><ul className="list-disc space-y-1 pl-5 text-sm">{report.nextSteps.map((t, i) => <li key={i}>{t}</li>)}</ul></Card>
    </div>
  );
}
