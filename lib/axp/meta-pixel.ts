/**
 * The Meta Pixel on the AXP Social pages. The pixel itself runs in the
 * browser (public/axp/meta-pixel.js); the server only hands it the pixel id
 * and lets the page's own Content-Security-Policy load Meta's script.
 */

// The pixel reports events as images, requests, or a form posted into a
// hidden frame, depending on the browser and the size of the event.
const META_SOURCES = {
  'script-src': 'https://connect.facebook.net',
  'img-src': 'https://www.facebook.com',
  'connect-src': 'https://www.facebook.com https://connect.facebook.net',
  'frame-src': 'https://www.facebook.com',
  'form-action': 'https://www.facebook.com',
};

/** The pixel id, or '' when it is not set or is not a pixel id. */
export function metaPixelId(): string {
  const id = (process.env.META_PIXEL_ID || '').trim();
  return /^\d{10,20}$/.test(id) ? id : '';
}

/** Adds the pixel to a page. Pages are returned unchanged when no pixel is set. */
export function withMetaPixel(html: string): string {
  const id = metaPixelId();
  if (!id) return html;
  const widened = html.replace(/(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")/, (_, open, policy: string, close) => {
    let next = policy;
    for (const [directive, sources] of Object.entries(META_SOURCES)) {
      const found = new RegExp(`${directive} ([^;]*)`).exec(next);
      if (found) {
        // 'none' cannot sit beside a source, so it gives way to Meta's.
        const kept = found[1].trim() === "'none'" ? '' : found[1].trim() + ' ';
        next = next.replace(found[0], `${directive} ${kept}${sources}`);
      } else {
        // An unlisted directive falls back to default-src 'self'; keep that and add Meta.
        next += `; ${directive} 'self' ${sources}`;
      }
    }
    return open + next + close;
  });
  return widened.replace('</head>', `<meta name="meta-pixel-id" content="${id}"></head>`);
}
