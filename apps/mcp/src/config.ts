function required(name: string, fallback?: string): string {
    const value = (process.env[name] ?? fallback ?? '').trim();
    if (!value) throw new Error(`Missing required env var: ${name}`);
    return value.replace(/\/$/, '');
}

export const config = {
    get apiBaseUrl() {
        return required('FRESHERFLOW_API_URL', process.env.API_URL || 'http://localhost:5000');
    },
    get siteUrl() {
        return (process.env.PUBLIC_SITE_URL || 'https://fresherflow.in').replace(/\/$/, '');
    },
    get port() {
        return Number(process.env.MCP_PORT || process.env.PORT || 5002);
    },
};
