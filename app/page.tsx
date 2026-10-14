import SiteShell from "@/components/SiteShell";
import Hero from "@/components/sections/Hero";
import FlowSection from "@/components/sections/FlowSection";
import Intro from "@/components/sections/Intro";
import Work from "@/components/sections/Work";
import Method from "@/components/sections/Method";
import OurWork from "@/components/sections/OurWork";
import Faq from "@/components/sections/Faq";
import Testimonials from "@/components/sections/Testimonials";
import CtaFooter from "@/components/sections/CtaFooter";
import type { Metadata } from "next";

// Per page, not in the layout: a canonical set there would be inherited by
// every route and point /privacy and /terms at the homepage.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <SiteShell>
      <Hero />
      <FlowSection />
      <Intro />
      <Work />
      <Method />
      <OurWork />
      <Faq />
      <Testimonials />
      <CtaFooter />
    </SiteShell>
  );
}
