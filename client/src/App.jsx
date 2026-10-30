import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/Auth.jsx';
import { Spinner } from './components/ui.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import ProjectLayout from './layouts/ProjectLayout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import NewProject from './pages/NewProject.jsx';
import Overview from './pages/Overview.jsx';
import Documents from './pages/Documents.jsx';
import Research from './pages/Research.jsx';
import Cost from './pages/Cost.jsx';
import Checklist from './pages/Checklist.jsx';
import Reports from './pages/Reports.jsx';
import ReportView from './pages/ReportView.jsx';
import SettingsPage from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

function Protected({ children }) {
  const { user, loading, error } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner label="Checking your session" />;
  if (error) return <div className="p-10 text-sm text-rust" role="alert">{error}</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<Protected><AppLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/new" element={<NewProject />} />
        <Route path="projects/:id" element={<ProjectLayout />}>
          <Route index element={<Overview />} />
          <Route path="documents" element={<Documents />} />
          <Route path="research" element={<Research />} />
          <Route path="cost" element={<Cost />} />
          <Route path="checklist" element={<Checklist />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:reportId" element={<ReportView />} />
        </Route>
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound standalone />} />
    </Routes>
  );
}
