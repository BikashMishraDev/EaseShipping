import { Field, Input, Select, Textarea } from '../components/ui.jsx';

export const emptyProject = { name: '', description: '', category: '', materials: [], ingredients: [], originCountry: 'IN', destinationCountry: 'US', declaredValue: '', currency: 'USD', quantity: '', weightKg: '', packaging: { type: '', notes: '' } };
const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

/** Convert form state to the API payload (blank strings become null so incomplete drafts can be saved). */
export function toPayload(f) {
  return {
    name: f.name, description: f.description, category: f.category,
    materials: Array.isArray(f.materials) ? f.materials : csv(f.materials), ingredients: Array.isArray(f.ingredients) ? f.ingredients : csv(f.ingredients),
    originCountry: f.originCountry, destinationCountry: f.destinationCountry, currency: f.currency,
    declaredValue: f.declaredValue === '' || f.declaredValue == null ? null : String(f.declaredValue),
    quantity: f.quantity === '' || f.quantity == null ? null : Number(f.quantity),
    weightKg: f.weightKg === '' || f.weightKg == null ? null : Number(f.weightKg),
    packaging: f.packaging,
  };
}
export function fromProject(p) {
  return { ...emptyProject, ...p, declaredValue: p.declaredValue ?? '', quantity: p.quantity ?? '', weightKg: p.weightKg ?? '', packaging: { type: p.packaging?.type || '', notes: p.packaging?.notes || '' } };
}

export function ProductSection({ f, set, errors }) {
  const list = (v) => (Array.isArray(v) ? v.join(', ') : v);
  return (
    <div className="space-y-4">
      <Field label="Project name" error={errors.name}><Input value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} required /></Field>
      <Field label="Product description" error={errors.description} hint="What it is, what it is made of and what it is used for. More detail gives better research."><Textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={4} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Product category" error={errors.category}><Input value={f.category} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. leather goods" /></Field>
        <Field label="Materials" hint="Separate with commas" error={errors.materials}><Input value={list(f.materials)} onChange={(e) => set({ materials: e.target.value })} /></Field>
      </div>
      <Field label="Ingredients (if applicable)" hint="Separate with commas" error={errors.ingredients}><Input value={list(f.ingredients)} onChange={(e) => set({ ingredients: e.target.value })} /></Field>
    </div>
  );
}

export function ShipmentSection({ f, set, errors }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Origin country" error={errors.originCountry}><Select value={f.originCountry} onChange={(e) => set({ originCountry: e.target.value })}><option value="IN">India</option></Select></Field>
        <Field label="Destination country" error={errors.destinationCountry} hint="Only the United States is supported in this version."><Select value={f.destinationCountry} onChange={(e) => set({ destinationCountry: e.target.value })}><option value="US">United States</option></Select></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Total declared value" error={errors.declaredValue}><Input inputMode="decimal" value={f.declaredValue} onChange={(e) => set({ declaredValue: e.target.value })} placeholder="1200.00" /></Field>
        <Field label="Currency" error={errors.currency}><Select value={f.currency} onChange={(e) => set({ currency: e.target.value })}>{['USD', 'INR', 'EUR', 'GBP', 'AED', 'SGD'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Quantity (units)" error={errors.quantity}><Input inputMode="numeric" value={f.quantity} onChange={(e) => set({ quantity: e.target.value })} /></Field>
      </div>
      <Field label="Total weight (kg)" error={errors.weightKg}><Input inputMode="decimal" value={f.weightKg} onChange={(e) => set({ weightKg: e.target.value })} /></Field>
    </div>
  );
}

export function PackagingSection({ f, set }) {
  return (
    <div className="space-y-4">
      <Field label="Packaging type"><Input value={f.packaging.type} onChange={(e) => set({ packaging: { ...f.packaging, type: e.target.value } })} placeholder="e.g. corrugated box with paper wrap" /></Field>
      <Field label="Packaging notes"><Textarea value={f.packaging.notes} onChange={(e) => set({ packaging: { ...f.packaging, notes: e.target.value } })} /></Field>
    </div>
  );
}
