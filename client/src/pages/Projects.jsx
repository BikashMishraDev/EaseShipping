import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Alert, Badge, Button, Empty, PageHeader, Spinner, fmtDate, statusTone } from '../components/ui.jsx';

export default function Projects() {
  const [archived, setArchived] = useState(false);
  const [items, setItems] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { setItems(null); api(`/projects?archived=${archived}`).then((d) => setItems(d.projects)).catch((e) => setErr(e.message)); }, [archived]);
  return (
    <>
      <PageHeader title="Export projects" action={<Link to="/app/projects/new" className="rounded-md bg-harbor px-3.5 py-2 text-sm font-medium text-white hover:bg-harbor-dark">New project</Link>}>One project per product and shipment.</PageHeader>
      <div className="mb-4 flex gap-2"><Button variant={archived ? 'secondary' : 'primary'} onClick={() => setArchived(false)}>Active</Button><Button variant={archived ? 'primary' : 'secondary'} onClick={() => setArchived(true)}>Archived</Button></div>
      {err && <Alert tone="bad">{err}</Alert>}
      {!items && !err && <Spinner />}
      {items?.length === 0 && <Empty title={archived ? 'No archived projects' : 'No projects yet'}>{archived ? 'Archived projects appear here.' : 'Create a project to begin.'}</Empty>}
      {items?.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-mist text-slate"><tr><th className="p-3 font-medium">Project</th><th className="p-3 font-medium">Route</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Updated</th></tr></thead>
            <tbody>{items.map((p) => (
              <tr key={p._id} className="border-b border-line last:border-0">
                <td className="p-3"><Link className="font-medium text-harbor underline" to={`/app/projects/${p._id}`}>{p.name}</Link>{p.missing.required.length > 0 && <span className="ml-2 text-xs text-rust">{p.missing.required.length} required detail(s) missing</span>}</td>
                <td className="p-3">{p.originCountry} to {p.destinationCountry}</td>
                <td className="p-3"><Badge tone={statusTone[p.status]}>{p.status}</Badge></td>
                <td className="p-3 text-slate">{fmtDate(p.updatedAt)}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
