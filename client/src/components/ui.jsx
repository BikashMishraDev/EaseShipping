import { Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function Button({ variant = 'primary', busy, className, children, ...p }) {
  const styles = {
    primary: 'bg-harbor text-white hover:bg-harbor-dark',
    secondary: 'bg-white text-ink border border-line hover:bg-mist',
    danger: 'bg-white text-rust border border-rust/40 hover:bg-rust/5',
    quiet: 'text-harbor hover:bg-mist',
  }[variant];
  return (
    <button {...p} disabled={busy || p.disabled}
      className={cx('inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', styles, className)}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-rust">{error}</span>}
    </label>
  );
}
export const inputCls = 'w-full rounded-md border border-line bg-white px-3 py-2 text-sm placeholder:text-slate/60';
export const Input = (p) => <input {...p} className={cx(inputCls, p.className)} />;
export const Select = (p) => <select {...p} className={cx(inputCls, p.className)} />;
export const Textarea = (p) => <textarea rows={3} {...p} className={cx(inputCls, p.className)} />;

export function Card({ title, action, children, className }) {
  return (
    <section className={cx('print-card rounded-lg border border-line bg-white p-5', className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const tones = {
  neutral: 'bg-mist text-ink',
  good: 'bg-moss/10 text-moss',
  warn: 'bg-amber/10 text-amber',
  bad: 'bg-rust/10 text-rust',
  info: 'bg-harbor/10 text-harbor',
};
export const Badge = ({ tone = 'neutral', children }) => (
  <span className={cx('inline-block rounded px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
);

export function Alert({ tone = 'info', title, children }) {
  const Icon = tone === 'bad' ? AlertTriangle : tone === 'good' ? CheckCircle2 : Info;
  const color = { info: 'border-harbor/30 bg-harbor/5', bad: 'border-rust/40 bg-rust/5', warn: 'border-amber/40 bg-amber/5', good: 'border-moss/40 bg-moss/5' }[tone];
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-md border p-3 text-sm', color)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{title && <p className="font-medium">{title}</p>}<div className="text-slate">{children}</div></div>
    </div>
  );
}

export const Spinner = ({ label = 'Loading' }) => (
  <div className="flex items-center gap-2 p-6 text-sm text-slate" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{label}…</div>
);

export const Empty = ({ title, children, action }) => (
  <div className="rounded-lg border border-dashed border-line bg-white p-10 text-center">
    <h3 className="font-semibold">{title}</h3>
    <p className="mx-auto mt-1 max-w-md text-sm text-slate">{children}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const PageHeader = ({ title, children, action }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{children && <p className="mt-1 max-w-2xl text-sm text-slate">{children}</p>}</div>
    {action}
  </div>
);

export const statusTone = { complete: 'good', partial: 'warn', blocked: 'neutral', failed: 'bad', draft: 'neutral', ready: 'info', analyzed: 'good' };
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');
