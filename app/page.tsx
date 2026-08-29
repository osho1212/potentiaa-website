import SiteShell from "@/components/SiteShell";
import FlowStage from "@/components/sections/FlowStage";
import Intro from "@/components/sections/Intro";
import Work from "@/components/sections/Work";
import Method from "@/components/sections/Method";
import OurWork from "@/components/sections/OurWork";
import Testimonials from "@/components/sections/Testimonials";
import CtaFooter from "@/components/sections/CtaFooter";

export default function HomePage() {
  return (
    <SiteShell>
      <FlowStage />
      <Intro />
      <Work />
      <Method />
      <OurWork />
      <Testimonials />
      <CtaFooter />
    </SiteShell>
  );
}
