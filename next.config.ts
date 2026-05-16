import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = (() => {
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return "";
  }
})();

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline scripts for hydration + Inter font
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: https://${supabaseHost} https://graph.facebook.com`,
      `font-src 'self' data:`,
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.resend.com https://graph.facebook.com`,
      `frame-src 'self' blob:`,
      `media-src 'self' blob:`,
      `worker-src 'self' blob:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jconofgquajgzylcfnfg.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
