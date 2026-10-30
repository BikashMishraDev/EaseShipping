import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../services/api.js';
import { Badge, Card, Empty, Spinner, fmtDate, statusTone } from '../components/ui.jsx';

export default function Reports() {
  const { project } = useOutletContext();
  const [items, setItems] = useState(null);
  useEffect(() => { api(`/projects/${project._id}/reports`).then((d) => setItems(d.reports)); }, [project._id]);
  if (!items) return <Spinner />;
  if (items.length === 0) return <Empty title="No saved reports">Each analysis you run is saved here as an export-readiness report you can reopen, print or download as a PDF.</Empty>;
  return (
    <Card title="Saved reports">
      <ul className="divide-y divide-line text-sm">
        {items.map((r) => (
          <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div><Link className="font-medium text-harbor underline" to={r._id}>Report from {fmtDate(r.createdAt)}</Link>
              <p className="text-slate">{r.classifications?.length || 0} candidate classification(s) | cost {r.cost?.status || 'n/a'}</p></div>
            <Badge tone={statusTone[r.status]}>{r.status}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
