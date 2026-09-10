// Bound an await that may never settle. Playwright lifecycle calls
// (page.close, newPage, context.close, browser.close) wait for a renderer
// ack that never comes on wedged pages — awaiting them raw can stall a worker
// forever, past every loop-top timeout check. Resolves null on timeout; never
// throws. Caller decides: abandon the handle (close) or bail out (newPage).
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}
