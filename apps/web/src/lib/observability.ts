// Lightweight in-memory route result counter for server-side observability.
const counts: Record<string, number> = {};

export function logRouteResult(
  route: string,
  result: '200' | '404' | '301' | '302' | '307' | '308' | '500'
) {
  if (process.env.NODE_ENV !== 'development') return;

  const key = `${route} [${result}]`;
  counts[key] = (counts[key] || 0) + 1;
  console.log(`[Route Observability] ${key} - count: ${counts[key]}`);
}