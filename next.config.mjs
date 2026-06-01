/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

// Sicherheits-Header. CSP bewusst minimal (nur frame-ancestors/base-uri/form-action),
// damit Next.js (inline-Bootstrap, Styles) nicht bricht — Clickjacking & Co. sind abgedeckt.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
  // HSTS nur in Produktion (sonst stoert es lokalen HTTP-Betrieb nicht, ist aber unnoetig)
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig = {
  poweredByHeader: false, // verraet keine Next.js-Version
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
