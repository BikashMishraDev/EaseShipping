import { Link } from 'react-router-dom';

export default function NotFound({ standalone }) {
  return (
    <div className={standalone ? 'flex min-h-screen items-center justify-center p-6' : 'py-10'}>
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-slate">That address does not match anything in EaseShipping. It may have moved, or you may not have access to it.</p>
        <Link to={standalone ? '/' : '/app'} className="mt-4 inline-block rounded-md bg-harbor px-4 py-2 text-sm font-medium text-white hover:bg-harbor-dark">{standalone ? 'Go to the home page' : 'Back to the dashboard'}</Link>
      </div>
    </div>
  );
}
