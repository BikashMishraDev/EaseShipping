import path from 'node:path';

export const ALLOWED = {
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.md': ['text/markdown', 'text/plain'],
  '.csv': ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  '.json': ['application/json', 'text/plain'],
};
export const MAX_TEXT = 60_000;

export function validateUpload(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED[ext]) return { ok: false, error: 'Unsupported file type. Upload PDF, TXT, MD, CSV or JSON. Images and scanned files need OCR, which is not configured.' };
  if (!ALLOWED[ext].includes(file.mimetype)) return { ok: false, error: 'File type does not match its extension.' };
  if (ext === '.pdf' && file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') return { ok: false, error: 'File is not a valid PDF.' };
  if (ext !== '.pdf' && file.buffer.includes(0)) return { ok: false, error: 'File appears to be binary, not text.' };
  return { ok: true, ext };
}

/** Returns { status: 'extracted'|'no_text'|'unsupported', text, note } */
export async function extractText(file, ext) {
  try {
    if (ext === '.pdf') {
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const out = await pdfParse(file.buffer);
      const text = (out.text || '').trim();
      if (text.length < 20) return { status: 'no_text', text: '', note: 'No selectable text found. This looks like a scanned PDF; OCR is not configured.' };
      return { status: 'extracted', text: text.slice(0, MAX_TEXT), note: text.length > MAX_TEXT ? 'Text truncated to the first 60,000 characters.' : '' };
    }
    const text = file.buffer.toString('utf8').trim();
    if (!text) return { status: 'no_text', text: '', note: 'File is empty.' };
    return { status: 'extracted', text: text.slice(0, MAX_TEXT), note: text.length > MAX_TEXT ? 'Text truncated to the first 60,000 characters.' : '' };
  } catch {
    return { status: 'unsupported', text: '', note: 'Text could not be read from this file.' };
  }
}
