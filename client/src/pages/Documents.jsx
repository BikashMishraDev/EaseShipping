import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, BASE } from '../services/api.js';
import { Alert, Badge, Button, Card, Empty, Input, Select, Spinner } from '../components/ui.jsx';

const types = [['commercial_invoice', 'Commercial invoice'], ['spec_sheet', 'Product specification sheet'], ['ingredient_list', 'Ingredient or material list'], ['shipping_document', 'Existing shipping document'], ['other', 'Other']];
const labels = { productDescription: 'Product description', materials: 'Materials', declaredValue: 'Declared value', currency: 'Currency', quantity: 'Quantity', totalWeightKg: 'Total weight (kg)', originCountry: 'Origin country', destinationCountry: 'Destination country', invoiceNumber: 'Invoice number', sellerName: 'Seller', buyerName: 'Buyer', incoterm: 'Incoterm', statedHsCode: 'HS code stated in document' };
const APPLICABLE = ['productDescription', 'materials', 'declaredValue', 'currency', 'quantity', 'totalWeightKg', 'originCountry', 'destinationCountry'];

function DocCard({ doc, ai, onChange, reloadProject }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [edits, setEdits] = useState({});
  const ex = doc.extraction;
  const run = async (name, fn) => { setBusy(name); setMsg(null); try { await fn(); } catch (e) { setMsg({ tone: 'bad', text: e.message }); } finally { setBusy(''); } };
  const val = (k) => edits[k] ?? (Array.isArray(ex.fields[k]?.value) ? ex.fields[k].value.join(', ') : String(ex.fields[k]?.value ?? ''));

  const extract = () => run('extract', async () => { await api(`/documents/${doc.id}/extract`, { method: 'POST', body: {} }); setEdits({}); await onChange(); });
  const review = (confirmed) => run('review', async () => {
    const fields = {};
    for (const [k, v] of Object.entries(edits)) fields[k] = { value: k === 'materials' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v };
    await api(`/documents/${doc.id}/review`, { method: 'PUT', body: { fields, confirmed } }); setEdits({}); await onChange();
  });
  const apply = () => run('apply', async () => {
    const r = await api(`/documents/${doc.id}/apply`, { method: 'POST', body: { fields: APPLICABLE.filter((k) => ex.fields[k]) } });
    await onChange(); reloadProject(); setMsg({ tone: 'good', text: `Applied to project: ${r.applied.map((k) => labels[k] || k).join(', ') || 'nothing new'}.` });
  });
  const remove = () => run('delete', async () => { if (window.confirm(`Delete ${doc.filename}?`)) { await api(`/documents/${doc.id}`, { method: 'DELETE' }); await onChange(); } });

  return (
    <Card title={doc.filename} action={<div className="flex gap-2"><a className="text-sm text-harbor underline" href={`${BASE}/api/v1/documents/${doc.id}/download`}>Download</a><button className="text-sm text-rust underline" onClick={remove}>Delete</button></div>}>
      <p className="text-sm text-slate">{types.find((t) => t[0] === doc.docType)?.[1]} | {(doc.size / 1024).toFixed(0)} KB {doc.confirmed && <Badge tone="good">Confirmed</Badge>}</p>
      {doc.textStatus !== 'extracted' && <div className="mt-3"><Alert tone="warn" title="No readable text">{doc.textNote} Upload a text-based PDF or a TXT/CSV file.</Alert></div>}
      {msg && <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      {doc.textStatus === 'extracted' && ex.status !== 'done' && (
        <div className="mt-3">
          {!ai && <Alert tone="warn" title="AI is not configured">Extraction needs MODEL_API_KEY on the server. Nothing has been extracted.</Alert>}
          {ex.status === 'failed' && <p className="mb-2 text-sm text-rust">Last attempt failed: {ex.error}</p>}
          <Button busy={busy === 'extract'} disabled={!ai} onClick={extract} className="mt-2">Extract details</Button>
        </div>
      )}
      {ex.status === 'done' && (
        <div className="mt-4">
          {ex.conflicts.length > 0 && <div className="mb-3"><Alert tone="warn" title="Document and project do not match">
            <ul className="list-disc pl-4">{ex.conflicts.map((c) => <li key={c.field}>{c.label}: project has "{c.projectValue}", document says "{c.documentValue}"</li>)}</ul></Alert></div>}
          {ex.missing.length > 0 && <p className="mb-3 text-sm text-slate">Not found in this document: {ex.missing.map((k) => labels[k] || k).join(', ')}. Nothing was guessed.</p>}
          <p className="mb-2 text-sm font-medium">Review the extracted details. Edit anything that is wrong.</p>
          <div className="space-y-3">
            {Object.keys(ex.fields).map((k) => (
              <div key={k} className="grid gap-1 md:grid-cols-[180px_1fr] md:items-start">
                <label htmlFor={`${doc.id}-${k}`} className="pt-2 text-sm text-slate">{labels[k] || k}</label>
                <div><Input id={`${doc.id}-${k}`} value={val(k)} onChange={(e) => setEdits({ ...edits, [k]: e.target.value })} />
                  <p className="mt-1 text-xs text-slate">{ex.fields[k].editedByUser ? 'Edited by you' : ex.fields[k].quoteVerified ? `Found in document: "${ex.fields[k].quote}"` : 'Could not be matched to the document text. Check carefully.'}</p></div>
              </div>
            ))}
            {Object.keys(ex.fields).length === 0 && <p className="text-sm text-slate">No details were found in this document.</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button busy={busy === 'review'} onClick={() => review(true)}>{doc.confirmed ? 'Save and keep confirmed' : 'Confirm these details'}</Button>
            {doc.confirmed && <Button variant="secondary" busy={busy === 'apply'} onClick={apply}>Apply to project</Button>}
            {doc.confirmed && <Button variant="quiet" onClick={() => review(false)}>Unconfirm</Button>}
            <Button variant="quiet" busy={busy === 'extract'} disabled={!ai} onClick={extract}>Run extraction again</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Documents() {
  const { project, reload } = useOutletContext();
  const [docs, setDocs] = useState(null);
  const [ai, setAi] = useState(false);
  const [docType, setDocType] = useState('commercial_invoice');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const load = useCallback(() => api(`/projects/${project._id}/documents`).then((d) => setDocs(d.documents)), [project._id]);
  useEffect(() => { load(); api('/system/status').then((s) => setAi(s.ai.configured)).catch(() => {}); }, [load]);

  const upload = async (e) => {
    e.preventDefault(); if (!file) return;
    setBusy(true); setErr(null);
    const form = new FormData(); form.append('docType', docType); form.append('file', file);
    try { await api(`/projects/${project._id}/documents`, { method: 'POST', form }); setFile(null); e.target.reset(); await load(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card title="Upload a document">
        <form onSubmit={upload} className="flex flex-wrap items-end gap-3">
          <label className="text-sm"><span className="mb-1 block font-medium">Document type</span><Select value={docType} onChange={(e) => setDocType(e.target.value)}>{types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label>
          <label className="text-sm"><span className="mb-1 block font-medium">File (PDF, TXT, CSV, MD, JSON, up to 5 MB)</span><input type="file" accept=".pdf,.txt,.csv,.md,.json" onChange={(e) => setFile(e.target.files[0] || null)} className="block text-sm" /></label>
          <Button type="submit" busy={busy} disabled={!file}>Upload</Button>
        </form>
        <p className="mt-3 text-xs text-slate">Images and scanned PDFs are not supported because OCR is not configured. Files are stored privately and only you can open them.</p>
        {err && <div className="mt-3"><Alert tone="bad">{err}</Alert></div>}
      </Card>
      {!docs ? <Spinner /> : docs.length === 0 ? <Empty title="No documents yet">Upload a commercial invoice or product sheet to pull shipment details out automatically. You review everything before it is used.</Empty> :
        docs.map((d) => <DocCard key={d.id} doc={d} ai={ai} onChange={load} reloadProject={reload} />)}
    </div>
  );
}
