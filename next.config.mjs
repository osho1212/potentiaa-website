import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/**
 * CONTENT SECURITY POLICY.
 *
 * Lists every origin the page is allowed to talk to, so injected markup cannot
 * load a script from elsewhere, post the contact form somewhere else, or frame
 * the site inside another one. Today that list is short: everything is
 * self-hosted (fonts via next/font, every image and frame sequence under
 * /assets), and the only third party is EmailJS, which the contact form calls.
 *
 * 'unsafe-inline' on scripts is what a statically generated Next.js page needs:
 * the framework inlines its own bootstrap scripts, and the alternative - a
 * per-request nonce - would turn every page into a dynamically rendered one.
 * The rest of the policy still holds without it.
 *
 * Adding a third-party service (analytics, a CAPTCHA, a map or video embed)
 * means adding its origin here, or the browser will block it.
 *
 * Development adds 'unsafe-eval' and websockets, which webpack's dev runtime and
 * hot reload need. Neither ships in a production build.
 */
function contentSecurityPolicy(isDev) {
  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://cdn.razorpay.com", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://*.razorpay.com"],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'", "blob:"],
    "connect-src": ["'self'", "https://api.emailjs.com", "https://*.razorpay.com", "https://api.razorpay.com", ...(isDev ? ["ws:"] : [])],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "frame-src": ["'self'", "https://*.razorpay.com", "https://api.razorpay.com", "https://maps.google.com", "https://www.google.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", "https://api.razorpay.com"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

/**
 * The security headers every response carries.
 */
function securityHeaders(isDev) {
  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(self), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ];
  if (!isDev) {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  }
  return headers;
}

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    poweredByHeader: false,
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders(isDev) }];
    },
    async rewrites() {
      return [
        { source: "/api/public-settings", destination: "/api/axp/public-settings" },
        { source: "/api/payment-config", destination: "/api/axp/payment-config" },
        { source: "/api/payments/:path*", destination: "/api/axp/payments/:path*" },
        { source: "/api/bookings/:path*", destination: "/api/axp/bookings/:path*" },
        { source: "/api/admin/:path*", destination: "/api/axp/admin/:path*" },
      ];
    },
  };
}

