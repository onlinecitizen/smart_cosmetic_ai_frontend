/** @type {import('next').NextConfig} */

// The API origin, if the build calls the backend directly (local development).
// In the deployed site this is the site's own origin (Netlify proxies /api/*).
function apiOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").origin;
  } catch {
    return "";
  }
}

// Security headers (backend docs/security.md §6). 'unsafe-inline' for scripts
// is needed by Next.js's inline bootstrap scripts without a nonce setup; the
// policy still blocks third-party scripts, framing, plugins and data exfiltration
// to other origins. Only applied to production builds: the dev server needs eval.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Captured photos are previewed from blob: URLs and never uploaded elsewhere.
  // Uploaded product photos are served by the API (same origin when deployed).
  `img-src 'self' data: blob: ${apiOrigin()}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin()}`.trim(),
  "media-src 'self' blob: mediastream:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera only for this site (the skin photo); everything else off.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
