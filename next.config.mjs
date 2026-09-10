// Layer 2 Cost Firewall: Abort startup if forbidden LLM API keys are detected (SR-10.2)
const FORBIDDEN_KEY_PATTERN = /(_API_KEY|_SECRET_KEY)$/i;
const FORBIDDEN_PROVIDER_PATTERN = /(OPENAI|ANTHROPIC|GOOGLE_AI|GEMINI|MISTRAL|COHERE|PERPLEXITY)/i;

const violations = [];
for (const key of Object.keys(process.env)) {
  if (FORBIDDEN_KEY_PATTERN.test(key) && FORBIDDEN_PROVIDER_PATTERN.test(key)) {
    violations.push(key);
  }
}

if (violations.length > 0) {
  console.error(
    `[COST-FIREWALL-SR-10.2] CRITICAL SECURITY VIOLATION: Prohibited AI provider keys found in environment:\n` +
    violations.map(v => `  - ${v}`).join('\n') +
    `\nStartup aborted.`
  );
  process.exit(1);
}

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "connect-src 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
