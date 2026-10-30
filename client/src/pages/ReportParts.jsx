import { Flag, CheckCheck } from 'lucide-react';
import { Badge, Button, cx } from '../components/ui.jsx';

const stageTone = { ok: 'good', partial: 'warn', needs_input: 'warn', unavailable: 'bad', failed: 'bad', skipped: 'neutral' };
export const Stages = ({ stages }) => (
  <ul className="divide-y divide-line text-sm">
    {stages.map((s, i) => (
      <li key={i} className="flex flex-wrap items-start justify-between gap-2 py-2">
        <div><p className="font-medium">{s.name}</p><p className="text-slate">{s.detail}</p></div>
        <Badge tone={stageTone[s.status]}>{s.status.replace('_', ' ')}</Badge>
      </li>
    ))}
  </ul>
);

export function ClassificationCard({ c, sources, onFlag, onSelect }) {
  const src = (c.sourceIds || []).map((id) => sources.find((s) => s.id === id)).filter(Boolean);
  return (
    <article className={cx('rounded-md border p-4', c.selected ? 'border-harbor bg-harbor/5' : 'border-line')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">{c.htsno}</p>
          <p className="text-sm text-slate">{c.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.selected && <Badge tone="info">Used for cost</Badge>}
          {c.flagged && <Badge tone="warn">Flagged</Badge>}
          <Badge>{c.confidence ? `${c.confidence} confidence` : 'confidence not rated'}</Badge>
        </div>
      </div>
      <p className="mt-3 text-sm"><span className="font-medium">General duty rate:</span> {c.generalRate || 'not listed'}</p>
      <p className="mt-2 text-sm"><span className="font-medium">Why it may fit:</span> {c.reasoning}</p>
      {c.missingInfo?.length > 0 && <p className="mt-2 text-sm text-amber"><span className="font-medium">Could change if known:</span> {c.missingInfo.join('; ')}</p>}
      {src.map((s) => (
        <p key={s.id} className="mt-2 text-xs text-slate">Source: <a className="underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>, {s.authority}. Retrieved {new Date(s.retrievedAt).toLocaleDateString()}. {s.limitations}</p>
      ))}
      <p className="mt-2 text-xs text-slate">AI-assisted suggestion. Not an official customs determination.</p>
      {(onFlag || onSelect) && (
        <div className="no-print mt-3 flex gap-2">
          {onSelect && <Button variant={c.selected ? 'secondary' : 'primary'} onClick={onSelect}><CheckCheck className="h-4 w-4" aria-hidden />{c.selected ? 'Stop using for cost' : 'Use for cost'}</Button>}
          {onFlag && <Button variant="secondary" onClick={onFlag}><Flag className="h-4 w-4" aria-hidden />{c.flagged ? 'Remove flag' : 'Flag for review'}</Button>}
        </div>
      )}
    </article>
  );
}

export function CostTable({ cost }) {
  if (!cost) return <p className="text-sm text-slate">No estimate yet.</p>;
  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center gap-2"><Badge tone={cost.status === 'complete' ? 'good' : 'warn'}>{cost.status === 'complete' ? 'Complete estimate' : 'Partial estimate'}</Badge><span className="text-slate">Valuation basis: {cost.valuationBasis}</span></div>
      {cost.lines.length > 0 && (
        <table className="w-full text-left"><tbody>
          {cost.lines.map((l) => (
            <tr key={l.key} className="border-b border-line"><td className="py-2 pr-3"><p>{l.label}</p><p className="text-xs text-slate">{l.basis}{l.source ? ` | ${l.source}` : ''}</p></td><td className="py-2 text-right tabular-nums">USD {l.amount}</td></tr>
          ))}
          <tr><td className="pt-3 font-semibold">{cost.status === 'complete' ? 'Total landed cost' : 'Total of listed lines only'}</td><td className="pt-3 text-right font-semibold tabular-nums">USD {cost.total}</td></tr>
          {cost.perUnit && <tr><td className="text-slate">Per unit</td><td className="text-right tabular-nums">USD {cost.perUnit}</td></tr>}
        </tbody></table>
      )}
      {cost.note && <p className="mt-3 text-amber">{cost.note}</p>}
      {cost.missing.length > 0 && <div className="mt-3"><p className="font-medium">Missing inputs</p><ul className="list-disc pl-5 text-slate">{cost.missing.map((m) => <li key={m}>{m}</li>)}</ul></div>}
      <details className="mt-3"><summary className="cursor-pointer font-medium">Assumptions and exclusions</summary>
        <ul className="mt-2 list-disc pl-5 text-slate">{cost.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        <p className="mt-2 font-medium">Not included</p><ul className="list-disc pl-5 text-slate">{cost.excluded.map((a) => <li key={a}>{a}</li>)}</ul>
      </details>
    </div>
  );
}
