export function getConfig(env: { 
  FRESHERFLOW_API_URL: string; 
  PUBLIC_SITE_URL: string; 
  MCP_PUBLIC_URL: string;
  INTERNAL_API_SECRET?: string;
}) {
  return {
    apiBaseUrl: env.FRESHERFLOW_API_URL.replace(/\/$/, ''),
    siteUrl: env.PUBLIC_SITE_URL.replace(/\/$/, ''),
    mcpPublicUrl: env.MCP_PUBLIC_URL.replace(/\/$/, ''),
    internalApiSecret: env.INTERNAL_API_SECRET,
  };
}