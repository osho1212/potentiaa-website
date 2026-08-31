import Reveal from "../Reveal";
import { site } from "@/lib/site";

/**
 * The illustrative workflow example - the section that used to be "Our Work".
 *
 * WHAT WAS HERE. Four case studies with invented client brands, invented
 * quantified outcomes, a "GST Compliant" claim, and four rendered dashboard
 * mockups showing an invented company, an invented user and European dispatch
 * routes. The eyebrow said "Case Studies & Systems" and the lede said "systems
 * we have engineered", so all of it read as delivered client work. See the note
 * on `site.example` for the full inventory.
 *
 * The DepthCarousel went with them. It exists to show images, and the only
 * images it had were the fabricated mockups; a carousel of four text panels is
 * a worse way to read four text panels than simply showing them. Its four JPGs
 * are deleted rather than left orphaned in public/.
 *
 * The label is rendered in the markup, above the content, not tucked into a
 * caption. An illustrative example presented without a visible label is a case
 * study whatever the intent, and the whole point of this rewrite is that a
 * reader can tell the difference at a glance.
 */
export default function OurWork() {
  const { eyebrow, title, label, lede, before, after, note } = site.example;

  return (
    <section className="section example-section" id="projects" data-theme-key="work">
      <div className="container">
        <div className="example__head">
          <Reveal>
            <p className="eyebrow">{eyebrow}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="section-title">{title}</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="example__label">{label}</p>
          </Reveal>
          <Reveal delay={160}>
            <p className="lede example__lede">{lede}</p>
          </Reveal>
        </div>

        <div className="example__grid">
          <Reveal delay={80}>
            <div className="example__col example__col--before">
              <h3 className="example__col-heading">{before.heading}</h3>
              <ol className="example__steps">
                {before.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="example__col example__col--after">
              <h3 className="example__col-heading">{after.heading}</h3>
              <ol className="example__steps">
                {after.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <p className="example__note">{note}</p>
        </Reveal>
      </div>
    </section>
  );
}
