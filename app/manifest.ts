import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * /manifest.webmanifest - the name, colours and icons a phone uses when
 * someone adds the site to their home screen.
 *
 * The icons sit on white because the mark's bottom module is midnight navy,
 * which disappears against a dark tile. The browser-tab icon (app/icon.png)
 * stays transparent.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} - business software for growing businesses`,
    short_name: site.name,
    description:
      "Tailored billing, inventory, workflow and management software for small and growing businesses.",
    start_url: "/",
    display: "browser",
    background_color: "#02040a",
    theme_color: "#020A24",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
