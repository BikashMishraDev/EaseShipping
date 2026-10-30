import { z } from 'zod';
import { chatJson, SAFETY_PREAMBLE } from '../ai/index.js';
import { verifyQuotes } from './verify.js';

export const FIELD_KEYS = ['productDescription', 'materials', 'declaredValue', 'currency', 'quantity', 'totalWeightKg', 'originCountry', 'destinationCountry', 'invoiceNumber', 'sellerName', 'buyerName', 'incoterm', 'statedHsCode'];

const fieldSchema = z.object({ value: z.union([z.string(), z.number(), z.array(z.string())]).nullable(), quote: z.string().nullable().optional() }).nullable().optional();
export const extractionSchema = z.object({ fields: z.object(Object.fromEntries(FIELD_KEYS.map((k) => [k, fieldSchema]))).partial() });

export { verifyQuotes, findConflicts } from './verify.js';

export function missingFromDoc(fields) {
  return ['productDescription', 'declaredValue', 'currency', 'quantity'].filter((k) => !fields[k]);
}

export async function extractStructured(text, docType) {
  const system = `${SAFETY_PREAMBLE}
Extract shipment/product facts from the document. For each field return {"value": ..., "quote": "<exact text copied from the document that supports the value>"} or null when the document does not state it. Never infer or compute values. Numbers must be plain numbers without currency symbols; declaredValue is the total declared value as a number string.
Fields: ${FIELD_KEYS.join(', ')}. materials is an array of strings. Country fields are ISO 3166-1 alpha-2 codes only if the document states the country clearly.
Output: {"fields": { ... }}`;
  const user = `Document type: ${docType}\n<untrusted_data>\n${text}\n</untrusted_data>`;
  const out = await chatJson({ system, user, schema: extractionSchema });
  return verifyQuotes(out.fields, text);
}
