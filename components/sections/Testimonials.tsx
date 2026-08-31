import Reveal from "../Reveal";
import { site } from "@/lib/site";

/**
 * "How we work with you" - the section that used to be testimonials.
 *
 * WHAT WAS HERE. A DriftWall: an endless perspective wall of twenty drifting
 * tiles carrying six fabricated quotations, attributed to six named people at
 * six named businesses who do not exist. See the note on `site.practice` for
 * why that had to go.
 *
 * WHY THE WALL WENT WITH THEM, and did not simply get new content. Two reasons,
 * and the second is the real one.
 *
 * The cheap reason is cost: twenty tiles inside a `preserve-3d` subtree, each
 * transformed every frame, each originally carrying its own backdrop-filter -
 * measured as the most expensive layout on the page.
 *
 * The real reason is that a drifting wall is the wrong instrument for this
 * content. It was built to make twenty quotes feel like a crowd, which is what
 * you want when the point is "many customers said this". The point here is
 * "here is precisely how we work", and precision is read, not glanced at. Copy
 * that moves while you read it cannot be read carefully, and this is the one
 * section where careful reading is the entire job.
 *
 * So: a static grid. No motion, no hover system, nothing drifting. Six
 * statements a reader can actually sit with.
 */
export default function Testimonials() {
  return (
    <section
      className="section practice"
      id="testimonials"
      data-theme-key="testimonials"
    >
      <div className="container">
        <div className="practice__head">
          <Reveal>
            <p className="eyebrow">{site.practice.eyebrow}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="section-title">{site.practice.title}</h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="lede practice__lede">{site.practice.lede}</p>
          </Reveal>
        </div>

        <ul className="practice__grid">
          {site.practice.items.map((item, i) => (
            <Reveal key={item.title} delay={80 + i * 60}>
              <li className="practice__item">
                <h3 className="practice__item-title">{item.title}</h3>
                <p className="practice__item-body">{item.body}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
