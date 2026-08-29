import Reveal from "../Reveal";
import { site } from "@/lib/site";

/**
 * The section the flow cards settle into as the hero scrolls away.
 *
 * Holds only copy. The cards and the particles that travel here live in the
 * pinned layer of components/sections/FlowStage, which spans this section and
 * the hero above it - that is the whole reason the two are wrapped together
 * rather than being ordinary siblings.
 *
 * The copy sits on the LEFT and the right half is deliberately empty: that is
 * where the cards land. Nothing here may fill that space.
 */
export default function FlowSection() {
  return (
    <section
      className="section flow-section"
      id="flow"
      data-theme-key="flow"
    >
      <div className="container flow-section__grid">
        <div className="flow-section__copy">
          <Reveal>
            <p className="eyebrow">{site.flowSection.eyebrow}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="section-title">{site.flowSection.title}</h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="lede flow-section__body">{site.flowSection.body}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
