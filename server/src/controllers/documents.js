import crypto from 'node:crypto';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { UploadedDocument } from '../models/UploadedDocument.js';
import { logActivity } from '../models/ActivityEvent.js';
import { asyncHandler, HttpError, oid, parse } from '../middleware/errors.js';
import { owned } from './projects.js';
import { validateUpload, extractText } from '../services/documents/extract.js';
import { extractStructured, findConflicts, missingFromDoc, FIELD_KEYS } from '../services/documents/structured.js';
import { AIError, aiStatus } from '../services/ai/index.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 } });

const DOC_TYPES = ['commercial_invoice', 'spec_sheet', 'ingredient_list', 'shipping_document', 'other'];
const safeName = (n) => String(n).replace(/[^\w.\- ]+/g, '_').slice(0, 200);
const view = (d) => ({
  id: d.id, projectId: d.projectId, docType: d.docType, filename: d.filename, mimeType: d.mimeType, size: d.size,
  textStatus: d.textStatus, textNote: d.textNote, extraction: d.extraction, confirmed: d.confirmed, createdAt: d.createdAt,
});

async function ownedDoc(req, select = '') {
    const d = await UploadedDocument.findOne({ _id: oid(req.params.docId), userId: req.user._id }).select(select);
    if (!d) throw new HttpError(404, 'Document not found');
    return d;
  }

const getDocuments = asyncHandler(async (req, res) => {
    const p = await owned(req);
    const items = await UploadedDocument.find({ projectId: p._id, userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ documents: items.map(view) });
  })

const postDocument = asyncHandler(async (req, res) => {
    const p = await owned(req);
    if (!req.file) throw new HttpError(400, 'Choose a file to upload');
    const { docType } = parse(z.object({ docType: z.enum(DOC_TYPES).default('other') }), req.body);
    const check = validateUpload(req.file);
    if (!check.ok) throw new HttpError(400, check.error);
    const t = await extractText(req.file, check.ext);
    const d = await UploadedDocument.create({
      userId: req.user._id, projectId: p._id, docType, filename: safeName(req.file.originalname), mimeType: req.file.mimetype, size: req.file.size,
      sha256: crypto.createHash('sha256').update(req.file.buffer).digest('hex'), data: req.file.buffer, text: t.text, textStatus: t.status, textNote: t.note,
    });
    await logActivity(req.user._id, p._id, 'document_uploaded', `Uploaded ${d.filename}`);
    res.status(201).json({ document: view(d) });
  })

const getDocumentID = asyncHandler(async (req, res) => res.json({ document: view(await ownedDoc(req))}))

const downloadDocument = asyncHandler(async (req, res) => {
    const d = await ownedDoc(req, '+data');
    res.set({ 'Content-Type': d.mimeType, 'Content-Disposition': `attachment; filename="${safeName(d.filename)}"`, 'X-Content-Type-Options': 'nosniff' });
    res.send(d.data);
  })

const postExtractedDocument = asyncHandler(async (req, res) => {
    const d = await ownedDoc(req, '+text');
    if (d.textStatus !== 'extracted' || !d.text) throw new HttpError(422, d.textNote || 'No readable text in this document');
    if (!aiStatus().configured) throw new HttpError(503, 'AI is not configured (MODEL_API_KEY is missing), so structured extraction is unavailable.');
    const project = await owned({ params: { id: String(d.projectId) }, user: req.user });
    try {
      const fields = await extractStructured(d.text, d.docType);
      d.extraction = { status: 'done', fields, conflicts: findConflicts(fields, project), missing: missingFromDoc(fields), extractedAt: new Date() };
      d.confirmed = false;
      d.markModified('extraction');
    } catch (e) {
      d.extraction = { status: 'failed', fields: {}, conflicts: [], missing: [], error: e instanceof AIError ? e.message : 'Extraction failed' };
      d.markModified('extraction');
      await d.save();
      throw new HttpError(502, d.extraction.error);
    }
    await d.save();
    res.json({ document: view(d) });
  })

  const reviewSchema = z.object({
    fields: z.record(z.enum(FIELD_KEYS), z.object({ value: z.union([z.string().max(2000), z.number(), z.array(z.string().max(200)).max(30)]) })).optional(),
    confirmed: z.boolean(),
  }).strict();

  const reviewDocument = asyncHandler(async (req, res) => {
    const d = await ownedDoc(req);
    const body = parse(reviewSchema, req.body);
    if (d.extraction.status !== 'done') throw new HttpError(422, 'Run extraction first');
    if (body.fields) {
      const next = { ...d.extraction.fields };
      for (const [k, f] of Object.entries(body.fields)) next[k] = { ...(next[k] || { quote: '', quoteVerified: false }), value: f.value, editedByUser: true };
      d.extraction.fields = next;
      const project = await owned({ params: { id: String(d.projectId) }, user: req.user });
      d.extraction.conflicts = findConflicts(next, project);
      d.extraction.missing = missingFromDoc(next);
      d.markModified('extraction');
    }
    d.confirmed = body.confirmed;
    await d.save();
    res.json({ document: view(d) });
  })

// Copy selected reviewed fields onto the project (explicit user action).

const applyDocument = asyncHandler(async (req, res) => {
    const d = await ownedDoc(req);
    const { fields } = parse(z.object({ fields: z.array(z.enum(FIELD_KEYS)).min(1) }), req.body);
    if (!d.confirmed) throw new HttpError(422, 'Confirm the extracted data before applying it');
    const p = await owned({ params: { id: String(d.projectId) }, user: req.user });
    const ex = d.extraction.fields;
    const set = {};
    for (const k of fields) {
      const v = ex[k]?.value;
      if (v == null) continue;
      if (k === 'productDescription') set.description = String(v).slice(0, 4000);
      if (k === 'materials' && Array.isArray(v)) set.materials = v.slice(0, 30);
      if (k === 'declaredValue' && /^\d{1,12}(\.\d{1,4})?$/.test(String(v))) set.declaredValue = String(v);
      if (k === 'currency' && /^[A-Za-z]{3}$/.test(String(v))) set.currency = String(v).toUpperCase();
      if (k === 'quantity' && Number.isInteger(Number(v)) && Number(v) > 0) set.quantity = Number(v);
      if (k === 'totalWeightKg' && Number(v) > 0) set.weightKg = Number(v);
      if (k === 'originCountry' && /^[A-Za-z]{2}$/.test(String(v))) set.originCountry = String(v).toUpperCase();
      if (k === 'destinationCountry' && /^[A-Za-z]{2}$/.test(String(v))) set.destinationCountry = String(v).toUpperCase();
    }
    p.set(set);
    await p.save();
    d.extraction.conflicts = findConflicts(ex, p);
    d.markModified('extraction');
    await d.save();
    await logActivity(req.user._id, p._id, 'document_applied', `Applied reviewed data from ${d.filename}`);
    res.json({ applied: Object.keys(set), document: view(d) });
  })

const deleteDocument = asyncHandler(async (req, res) => {
    const d = await ownedDoc(req);
    await d.deleteOne();
    res.json({ ok: true });
  })

export const documentController = {
    getDocuments,
    upload,
    postDocument,
    getDocumentID,
    downloadDocument,
    postExtractedDocument,
    reviewDocument,
    applyDocument,
    deleteDocument
}