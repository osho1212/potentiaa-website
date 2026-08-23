"use client";

import { ContactProvider } from "./ContactContext";
import SmoothScroll from "./SmoothScroll";
import DepthField from "./DepthField";
import ModuleStack from "./ModuleStack";
import Header from "./Header";
import ContactModal from "./ContactModal";

/**
 * Client shell around the page. Owns the scroll engine, the fixed visual
 * layers and the contact dialog, so the sections themselves stay simple.
 */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <ContactProvider>
      <SmoothScroll />
      <DepthField />
      <ModuleStack />
      <Header />
      <main>{children}</main>
      <ContactModal />
    </ContactProvider>
  );
}
