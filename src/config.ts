import 'dotenv/config';

export const config = {
  croo: {
    apiUrl: process.env.CROO_API_URL || 'https://api.croo.network',
    wsUrl: process.env.CROO_WS_URL || 'wss://api.croo.network/ws',
    sdkKey: process.env.CROO_SDK_KEY || '',
  },
  services: {
    quickId: process.env.CROO_QUICK_SERVICE_ID || '',
    deepId: process.env.CROO_DEEP_SERVICE_ID || '',
    dossierId: process.env.CROO_DOSSIER_SERVICE_ID || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  tavily: {
    apiKey: process.env.TAVILY_API_KEY || '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    senderEmail: process.env.SENDER_EMAIL || 'reports@omniresearch.ai',
  },
} as const;

export function validateConfig(): void {
  const required = [
    ['CROO_SDK_KEY', config.croo.sdkKey],
    ['GEMINI_API_KEY', config.gemini.apiKey],
  ] as const;

  const missing = required.filter(([, val]) => !val).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}. Copy .env.example to .env and fill in your keys.`);
  }
}
