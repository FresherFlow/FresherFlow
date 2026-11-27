// Lightweight in-memory route result counter for server-side observability.
//
// Production per-route cost (duration + CPU) lives in `lib/routeMetrics.ts`.
// It is deliberately a separate module: this file is imported by the Edge
// proxy, and routeMetrics pulls in `after` from `next/server`, which is a
// Node/route-handler API.
const counts: Record<string, number> = {};

export function logRouteResult(
  route: string,
  result: '200' | '404' | '301' | '302' | '307' | '308' | '429' | '500' | '503'
) {
  if (process.env.NODE_ENV !== 'development') return;

  const key = `${route} [${result}]`;
  counts[key] = (counts[key] || 0) + 1;
  console.log(`[Route Observability] ${key} - count: ${counts[key]}`);
}
