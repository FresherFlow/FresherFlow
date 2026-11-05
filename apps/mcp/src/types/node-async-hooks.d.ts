/**
 * `nodejs_compat` provides `node:async_hooks` at runtime — the wrangler bundle
 * resolves it as an external — but `@cloudflare/workers-types` does not declare
 * any `node:*` module. Pulling `@types/node` into this package would collide
 * with the Workers globals, so this declares the one class the server uses.
 */
declare module 'node:async_hooks' {
  export class AsyncLocalStorage<T> {
    run<R>(store: T, callback: () => R): R;
    getStore(): T | undefined;
  }
}
