import { site } from "@/lib/site";

/**
 * /.well-known/security.txt (RFC 9116): where to report a vulnerability.
 *
 * Generated at build time rather than kept as a file in public/, because the
 * RFC requires an Expires date under a year out. Every deploy pushes it
 * forward, so it only goes stale if the site goes ~10 months without one.
 */
export const dynamic = "force-static";

const VALID_FOR_MS = 300 * 24 * 60 * 60 * 1000;

export function GET() {
  const body = [
    `Contact: mailto:${site.contact.email}`,
    `Expires: ${new Date(Date.now() + VALID_FOR_MS).toISOString()}`,
    "Preferred-Languages: en",
    `Canonical: ${site.url}/.well-known/security.txt`,
  ].join("\n");

  return new Response(`${body}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
