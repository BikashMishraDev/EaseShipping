export function projectMissing(p) {
  const required = [];
  const recommended = [];
  if (!p.description?.trim()) required.push({ field: 'description', label: 'Product description' });
  if (!p.declaredValue) required.push({ field: 'declaredValue', label: 'Declared value' });
  if (!p.quantity) required.push({ field: 'quantity', label: 'Quantity' });
  if (!p.weightKg) required.push({ field: 'weightKg', label: 'Total weight' });
  if (!p.category?.trim()) recommended.push({ field: 'category', label: 'Product category' });
  if (!p.materials?.length && !p.ingredients?.length) recommended.push({ field: 'materials', label: 'Materials or ingredients' });
  if (!p.packaging?.type?.trim()) recommended.push({ field: 'packaging', label: 'Packaging type' });
  return { required, recommended };
}
