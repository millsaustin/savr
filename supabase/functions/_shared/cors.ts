// CORS headers for Supabase Edge Functions
// Adjust allowed origins for production

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Change to specific domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Production-ready CORS headers with origin validation
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || ['*'];

  let allowOrigin = '*';

  if (origin && allowedOrigins.includes('*')) {
    allowOrigin = '*';
  } else if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  } else if (!origin) {
    allowOrigin = allowedOrigins[0];
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
  };
}
