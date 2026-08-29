import SiteShell from "@/components/SiteShell";
import FlowStage from "@/components/sections/FlowStage";
import Intro from "@/components/sections/Intro";
import Work from "@/components/sections/Work";
import Method from "@/components/sections/Method";
import Process from "@/components/sections/Process";
import Testimonials from "@/components/sections/Testimonials";
import CtaFooter from "@/components/sections/CtaFooter";

/**
 * The page, once.
 *
 * It used to be rendered twice - a "lap" and an aria-hidden clone - so that
 * SmoothScroll could teleport the reader a whole lap back and make the page
 * scroll forever. That is gone, and with it a long tail of workarounds the
 * duplication forced: every section took a `clone` flag so the second copy
 * could drop its id, its h1 and its landmark role; the clone's focusable
 * descendants had to be swept out of the tab order on every mutation; and the
 * reader was parked half a lap down the document at load, so the copy they
 * actually read was the clone rather than this one.
 *
 * A single copy needs none of that. The ids, the h1 and the contentinfo
 * landmark are simply correct now, because there is only one of each.
 */
export default function HomePage() {
  return (
    <SiteShell>
      <FlowStage />
      <Intro />
      <Work />
      <Method />
      <Process />
      <Testimonials />
      <CtaFooter />
    </SiteShell>
  );
}
