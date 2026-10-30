import { NavLink, Outlet, Link } from 'react-router-dom';
import { Anchor, LayoutDashboard, FolderOpen, Settings, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../context/Auth.jsx';

const link = ({ isActive }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-harbor text-white' : 'text-ink hover:bg-mist'}`;

export default function AppLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print border-b border-line bg-white p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <Link to="/app" className="mb-5 flex items-center gap-2 font-semibold"><Anchor className="h-5 w-5 text-harbor" aria-hidden />EaseShipping</Link>
        <Link to="/app/projects/new" className="mb-4 flex items-center justify-center gap-2 rounded-md bg-harbor px-3 py-2 text-sm font-medium text-white hover:bg-harbor-dark"><Plus className="h-4 w-4" aria-hidden />New export project</Link>
        <nav aria-label="Main" className="flex gap-1 md:flex-col">
          <NavLink end to="/app" className={link}><LayoutDashboard className="h-4 w-4" aria-hidden />Dashboard</NavLink>
          <NavLink to="/app/projects" end className={link}><FolderOpen className="h-4 w-4" aria-hidden />Projects</NavLink>
          <NavLink to="/app/settings" className={link}><Settings className="h-4 w-4" aria-hidden />Settings</NavLink>
        </nav>
        <div className="mt-6 hidden border-t border-line pt-4 text-sm md:block">
          <p className="truncate font-medium">{user?.name}</p>
          <p className="truncate text-xs text-slate">{user?.workspace?.name}</p>
          <button onClick={logout} className="mt-2 flex items-center gap-2 text-slate hover:text-ink"><LogOut className="h-4 w-4" aria-hidden />Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10"><div className="mx-auto max-w-5xl"><Outlet /></div></main>
    </div>
  );
}
