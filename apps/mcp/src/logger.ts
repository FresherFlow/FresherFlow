// Minimal structured logger. Kept dependency-free so the MCP server
// stays lightweight; swap for pino/winston later if needed.

const isDev = process.env.NODE_ENV !== 'production';

function serializeError(error: unknown): unknown {
    if (error instanceof Error) {
        return { name: error.name, message: error.message, stack: isDev ? error.stack : undefined };
    }
    return error;
}

export const logger = {
    info(message: string, meta?: Record<string, unknown>): void {
        console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), message, ...meta }));
    },
    error(message: string, meta?: Record<string, unknown>): void {
        const { error, ...rest } = meta ?? {};
        console.error(JSON.stringify({
            level: 'error',
            time: new Date().toISOString(),
            message,
            error: error !== undefined ? serializeError(error) : undefined,
            ...rest,
        }));
    },
};
