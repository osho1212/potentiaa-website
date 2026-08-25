"use client";

import { ContactProvider } from "./ContactContext";
import SmoothScroll from "./SmoothScroll";
import DepthField from "./DepthField";
import ModuleStack from "./ModuleStack";
import Header from "./Header";
import ContactModal from "./ContactModal";
import { useMediaQuery } from "@/lib/useMediaQuery";

/**
 * Client shell around the page. Owns the scroll engine, the fixed visual
 * layers and the contact dialog, so the sections themselves stay simple.
 */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  /**
   * THE MODULE IS NOT MOUNTED ON A PHONE.
   *
   * It is the logo mark as a 3D object: it sits in the navbar, flies out as the
   * hero leaves, and parks itself on the glass in the flow section. On a phone
   * there is no gutter for it to travel through, so it arrives on top of the
   * copy and the staircase rather than beside them.
   *
   * NOT HIDDEN IN CSS, which is the trap here. The component writes
   * `--hero-dock` to the root every frame, and .header__logo is
   * `opacity: calc(1 - var(--hero-dock))` - the two are crossfaded so there is
   * exactly one mark in the navbar. Hiding the canvas would leave that running:
   * the module would be invisible, the flat mark would still fade out for it,
   * and the header would have no logo at all. Not mounting it leaves
   * `--hero-dock` unset, which resolves to 0 and pins the flat mark on - the
   * same state the page has before the script runs.
   *
   * Skipped while the answer is still null, so a phone never briefly mounts it
   * and pays for the frame sequence it preloads.
   */
  const narrow = useMediaQuery("(max-width: 767px)");

  return (
    <ContactProvider>
      <SmoothScroll />
      <DepthField />
      {narrow === false ? <ModuleStack /> : null}
      <Header />
      <main>{children}</main>
      <ContactModal />
    </ContactProvider>
  );
}
