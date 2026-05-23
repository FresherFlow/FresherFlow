export function normalizeNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null') return undefined;
  
  const parsed = Number(trimmed);
  return isNaN(parsed) ? undefined : parsed;
}
