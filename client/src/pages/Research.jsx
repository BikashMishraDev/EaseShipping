import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../services/api.js';
import { Alert, Badge, Button, Card, Empty, Spinner, statusTone, fmtDate } from '../components/ui.jsx';
import { ClassificationCard, Stages } from './ReportParts.jsx';

export default function Research() {
  const { project, reload } = useOutletContext();
  const [report, setReport] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    const { reports } = await api(`/projects/${project._id}/reports`);
    setReport(reports[0] ? (await api(`/reports/${reports[0]._id}`)).report : null);
  }, [project._id]);
  useEffect(() => { load().catch((e) => setErr(e.message)); api('/system/status').then(setStatus).catch(() => {}); }, [load]);

  const run = async () => {
    setBusy(true); setErr(null);
    try { const { report: r } = await api(`/projects/${project._id}/reports/analysis`, { method: 'POST', body: {} }); setReport(r); reload(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const act = async (i, body) => { const { report: r } = await api(`/reports/${report._id}/classifications/${i}`, { method: 'PATCH', body }); setReport(r); };
  const required = project.missing.required;

  return (
    <div className="space-y-4">
      {status && !status.ai.configured && <Alert tone="warn" title="AI analysis is not configured">Set MODEL_API_KEY on the server to enable product analysis and HS classification. You can still run the analysis to get the starter checklist and a partial cost estimate.</Alert>}
      {required.length > 0 && <Alert tone="warn" title="Add required details first">{required.map((m) => m.label).join(', ')}.</Alert>}
      {err && <Alert tone="bad">{err}</Alert>}
      <Card title="Trade research and HS classification" action={<Button busy={busy} onClick={run}>{report ? 'Run analysis again' : 'Run analysis'}</Button>}>
        <p className="text-sm text-slate">Looks up candidate tariff codes in the official US schedule, explains why each may fit, and builds your checklist. Takes up to a minute.</p>
      </Card>
      {report === undefined && <Spinner />}
      {report === null && <Empty title="No analysis yet">Run an analysis to see candidate classifications and supporting sources.</Empty>}
      {report && (
        <>
          <Card title="Latest analysis" action={<span className="flex items-center gap-2 text-sm"><Badge tone={statusTone[report.status]}>{report.status}</Badge><span className="text-slate">{fmtDate(report.createdAt)}</span></span>}>
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">{report.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <Stages stages={report.stages} />
          </Card>
          {report.missingInfo.length > 0 && <Card title="Missing information"><ul className="list-disc space-y-1 pl-5 text-sm">{report.missingInfo.map((m, i) => <li key={i}><span className="font-medium">{m.label}</span> <span className="text-slate">({m.severity.replace('_', ' ')}){m.why ? `: ${m.why}` : ''}</span></li>)}</ul></Card>}
          {report.conflicts.length > 0 && <Alert tone="warn" title="Conflicts in your documents">{report.conflicts.map((c, i) => <p key={i}>{c.label}: project "{c.projectValue}" vs {c.document} "{c.documentValue}"</p>)}</Alert>}
          <Card title="Candidate classifications">
            {report.classifications.length === 0 ? <p className="text-sm text-slate">No classification was suggested. See the stages above for why.</p> :
              <div className="space-y-3">{report.classifications.map((c, i) => <ClassificationCard key={c.htsno} c={c} sources={report.sources} onFlag={() => act(i, { flagged: !c.flagged })} onSelect={() => act(i, { selected: !c.selected })} />)}</div>}
          </Card>
          <p className="text-sm text-slate">Next: <Link className="text-harbor underline" to="../cost">calculate landed cost</Link> or <Link className="text-harbor underline" to="../checklist">work through the checklist</Link>.</p>
        </>
      )}
    </div>
  );
}
