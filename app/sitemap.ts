import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * /sitemap.xml. Add a route here when you add a page.
 *
 * The homepage is stamped with the build date, since every deploy can change
 * it; the legal pages carry the date they were last revised.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const legalUpdated = new Date(site.legal.lastUpdated);

  return [
    { url: `${site.url}/`, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/privacy`, lastModified: legalUpdated, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/terms`, lastModified: legalUpdated, changeFrequency: "yearly", priority: 0.3 },
  ];
}
