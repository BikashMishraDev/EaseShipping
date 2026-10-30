import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Alert, Badge, Spinner, statusTone } from '../components/ui.jsx';

const tabs = [
  ['', 'Overview'], ['documents', 'Documents'], ['research', 'Research'], ['cost', 'Landed cost'], ['checklist', 'Checklist'], ['reports', 'Reports'],
];

export default function ProjectLayout() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api(`/projects/${id}`).then((d) => setProject(d.project)).catch((e) => setError(e.message)), [id]);
  useEffect(() => { setProject(null); setError(null); load(); }, [load]);

  if (error) return <div className="space-y-3"><Alert tone="bad" title="Project not found">{error}</Alert><Link className="text-sm text-harbor underline" to="/app/projects">Back to projects</Link></div>;
  if (!project) return <Spinner label="Loading project" />;
  return (
    <div>
      <div className="no-print mb-1 flex flex-wrap items-center gap-2">
        <Link to="/app/projects" className="text-sm text-slate hover:text-ink">Projects</Link><span className="text-slate">/</span>
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <Badge tone={statusTone[project.status]}>{project.status}</Badge>
        {project.archivedAt && <Badge>archived</Badge>}
      </div>
      <p className="no-print mb-4 text-sm text-slate">{project.originCountry} to {project.destinationCountry}</p>
      <nav aria-label="Project sections" className="no-print mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map(([to, label]) => (
          <NavLink key={to} end={to === ''} to={to} className={({ isActive }) => `whitespace-nowrap border-b-2 px-3 py-2 text-sm ${isActive ? 'border-harbor font-medium text-harbor' : 'border-transparent text-slate hover:text-ink'}`}>{label}</NavLink>
        ))}
      </nav>
      <Outlet context={{ project, setProject, reload: load }} />
    </div>
  );
}
