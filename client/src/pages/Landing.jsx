import { Link } from 'react-router-dom';
import { Anchor, FileSearch, Calculator, ListChecks } from 'lucide-react';

const steps = [
  [FileSearch, 'Describe the product and upload your invoice', 'EaseShipping reads your documents, shows you what it found and asks you to confirm before anything is used.'],
  [Calculator, 'See candidate HS codes and a transparent cost', 'Codes come from the official US tariff schedule. Costs are calculated with fixed arithmetic, never by the AI.'],
  [ListChecks, 'Work through a checklist, then save a report', 'Every item says whether it is confirmed, a recommendation, or something a broker should verify.'],
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-5">
        <span className="flex items-center gap-2 font-semibold"><Anchor className="h-5 w-5 text-harbor" aria-hidden />EaseShipping</span>
        <Link to="/login" className="rounded-md border border-line bg-white px-3.5 py-2 text-sm font-medium hover:bg-mist">Sign in</Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Global shipping. Made simpler.</h1>
            <p className="mt-4 max-w-lg text-lg text-slate">Research the tariff code, duties and paperwork for your first export from India to the United States, with every finding tied to a source.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login" className="rounded-md bg-harbor px-5 py-2.5 text-sm font-medium text-white hover:bg-harbor-dark">Start an export project</Link>
            </div>
            <p className="mt-4 text-xs text-slate">Research assistance only. EaseShipping is not a carrier, a customs authority or legal advice.</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-5" aria-label="Example export readiness summary">
            <p className="text-xs text-slate">Sample report excerpt (illustrative)</p>
            <p className="mt-1 font-semibold">Handmade leather wallets, India to US</p>
            <dl className="mt-4 divide-y divide-line text-sm">
              {[['Candidate HTS', '4202.31.xx (needs review)'], ['General duty', 'From the USITC schedule'], ['Landed cost', 'Partial until freight is entered'], ['Checklist', '8 items, 0 confirmed by a live source']].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-slate">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {steps.map(([Icon, t, d]) => (
            <div key={t} className="rounded-lg border border-line bg-white p-5">
              <Icon className="h-5 w-5 text-harbor" aria-hidden />
              <h2 className="mt-3 font-semibold">{t}</h2>
              <p className="mt-1 text-sm text-slate">{d}</p>
            </div>
          ))}
        </section>
        <p className="mt-10 max-w-2xl text-sm text-slate">Version one covers the India to United States corridor only. When a source or the AI service is unavailable, EaseShipping says so instead of guessing.</p>
      </main>
    </div>
  );
}
