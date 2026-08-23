import SiteShell from "@/components/SiteShell";
import Hero from "@/components/sections/Hero";
import Intro from "@/components/sections/Intro";
import Work from "@/components/sections/Work";
import Helping from "@/components/sections/Helping";
import Services from "@/components/sections/Services";
import Process from "@/components/sections/Process";
import CtaFooter from "@/components/sections/CtaFooter";

/**
 * One lap of the page.
 *
 * Rendered twice below so the document repeats with a fixed period, which is
 * what lets SmoothScroll teleport the reader a whole lap without anything
 * visibly changing. See the diagram in components/SmoothScroll.tsx.
 */
function Lap({ clone }: { clone?: boolean }) {
  return (
    <>
      <Hero clone={clone} />
      <Intro clone={clone} />
      <Work clone={clone} />
      <Helping clone={clone} />
      <Services clone={clone} />
      <Process clone={clone} />
      <CtaFooter clone={clone} />
    </>
  );
}

export default function HomePage() {
  return (
    <SiteShell>
      {/* data-lap marks the measured copy - SmoothScroll reads its height. */}
      <div data-lap="primary">
        <Lap />
      </div>

      {/*
        The clone. Hidden from assistive tech, still usable with a mouse - and
        that distinction is the whole point, because `inert` was doing both.

        The wrap keeps the reader inside [0.5 lap, 1.5 lap], which means what
        they actually look at is the SECOND half of primary and the FIRST half
        of clone. Measured: primary's hero, intro, Work and Helping are never
        once on screen - their reachable window closes before the band opens. So
        every visitor was reading the clone copies of them, and the clone was
        `inert`: the hero's two CTAs could not be clicked, the four Work cards
        could not be clicked, and the mascot's hover redirect was dead on Work
        because inert subtrees do not receive pointer events at all. The craft
        critic found the hover symptom; the cause reaches the primary conversion
        controls on the page.

        `aria-hidden` alone gives the intended result: one copy announced, one
        set of tab stops, and both copies clickable. Focusable descendants are
        pulled out of the tab order in SmoothScroll rather than here, so the
        rule cannot be forgotten when a section gains a new control.

        The textbook fix is three laps with only the middle one interactive,
        which removes the asymmetry instead of compensating for it. It also
        costs another full copy of a page that already preloads 90 hero frames
        and mounts four explainers. Worth doing if the DOM budget ever allows;
        not worth it to fix a bug this fix already closes.
      */}
      <div data-lap="clone" aria-hidden="true">
        <Lap clone />
      </div>
    </SiteShell>
  );
}
