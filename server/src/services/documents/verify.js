const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

/** Keep values only as claims; flag any whose supporting quote is not literally present in the document. */
export function verifyQuotes(fields, text) {
  const hay = norm(text);
  const out = {};
  for (const [k, f] of Object.entries(fields || {})) {
    if (!f || f.value == null || f.value === '' || (Array.isArray(f.value) && !f.value.length)) continue;
    const quote = f.quote ? String(f.quote) : '';
    out[k] = { value: f.value, quote, quoteVerified: quote.length >= 3 && hay.includes(norm(quote)) };
  }
  return out;
}

/** Deterministic conflicts between extracted values and what the user entered on the project. */
export function findConflicts(fields, project) {
  const c = [];
  const cmp = (key, label, projVal, docVal, eq) => {
    if (projVal == null || projVal === '' || docVal == null) return;
    if (!eq(projVal, docVal)) c.push({ field: key, label, projectValue: String(projVal), documentValue: String(docVal) });
  };
  const num = (a, b) => Number(a) === Number(b);
  const str = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();
  cmp('declaredValue', 'Declared value', project.declaredValue, fields.declaredValue?.value, num);
  cmp('currency', 'Currency', project.currency, fields.currency?.value, str);
  cmp('quantity', 'Quantity', project.quantity, fields.quantity?.value, num);
  cmp('totalWeightKg', 'Total weight (kg)', project.weightKg, fields.totalWeightKg?.value, num);
  cmp('originCountry', 'Origin country', project.originCountry, fields.originCountry?.value, str);
  cmp('destinationCountry', 'Destination country', project.destinationCountry, fields.destinationCountry?.value, str);
  return c;
}

