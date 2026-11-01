export function bearerFromHeaders(headers: Record<string, unknown>): string | null {
  const auth = headers['authorization'] ?? headers['Authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

let currentToken: string | null = null;

export function currentAccessToken(): string | null {
  return currentToken;
}

export async function runWithAccessToken<T>(token: string, fn: () => Promise<T>): Promise<T> {
  const prev = currentToken;
  currentToken = token;
  try {
    return await fn();
  } finally {
    currentToken = prev;
  }
}