import Reveal from "../Reveal";
import Marquee from "../Marquee";
import { site } from "@/lib/site";

export default function Intro({ clone }: { clone?: boolean }) {
  return (
    <section className="section" id={clone ? undefined : "intro"} data-theme-key="intro">
      <div className="container">
        <Marquee />

        <div className="intro__grid" style={{ marginTop: "var(--space-16)" }}>
          <div>
            <Reveal>
              <p className="eyebrow">{site.intro.eyebrow}</p>
            </Reveal>
            <Reveal delay={80}>
              {/* An h2, not a p. This section had no heading at all, so the
                  document went h1 -> h3 x4 -> h2 and a screen-reader user
                  skipping by heading landed inside the promises with nothing
                  above them to say what they were. This line is already the
                  section's de facto heading; it just was not marked as one.
                  Visual weight is unchanged - .intro__statement carries it. */}
              <h2 className="intro__statement">{site.intro.statement}</h2>
            </Reveal>
          </div>

          <div>
            <Reveal delay={160}>
              <p className="lede">{site.intro.body}</p>
            </Reveal>

            <div className="intro__stats">
              {site.intro.promises.map((promise, index) => (
                <Reveal variant="scale" key={promise.title} delay={200 + index * 70}>
                  <div>
                    <h3 className="service__title">{promise.title}</h3>
                    <p className="intro__stat-label">{promise.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
