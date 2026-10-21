/**
 * What a link to a page shows when it is shared on WhatsApp, Instagram, X or
 * in a message: a title, a line of description and a large picture. Also the
 * page's description for search results, its canonical address and its icon.
 * Every value is plain text, escaped here.
 */
export function shareTags({
  title,
  description,
  url,
  image,
  imageAlt,
}: {
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
}): string {
  const e = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return [
    `<meta name="description" content="${e(description)}">`,
    `<link rel="canonical" href="${e(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="AxP Social">`,
    `<meta property="og:title" content="${e(title)}">`,
    `<meta property="og:description" content="${e(description)}">`,
    `<meta property="og:url" content="${e(url)}">`,
    `<meta property="og:image" content="${e(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${e(imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${e(title)}">`,
    `<meta name="twitter:description" content="${e(description)}">`,
    `<meta name="twitter:image" content="${e(image)}">`,
    `<meta name="theme-color" content="#f5f1e9">`,
    `<link rel="icon" type="image/png" href="/axp/emblem-256.png">`,
    `<link rel="apple-touch-icon" href="/axp/apple-touch-icon.png">`,
  ].join('');
}
