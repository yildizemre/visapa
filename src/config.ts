// Development: Vite proxy forwards /api to backend. Production: set VITE_API_URL
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? '';
