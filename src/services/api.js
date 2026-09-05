const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

// An empty base preserves Vite's local /api proxy.
export const API_BASE = configuredApiUrl ? configuredApiUrl.replace(/\/$/, '') : '';