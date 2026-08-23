import Reveal from "../Reveal";
import ZealExplainer from "../ZealExplainer";
import { site } from "@/lib/site";

const SPAN_CLASS = {
  wide: "card card--wide",
  narrow: "card card--narrow",
  half: "card card--half",
} as const;

export default function Work({ clone }: { clone?: boolean }) {
  return (
    <section className="section" id={clone ? undefined : "work"} data-theme-key="work">
      <div className="container">
        <div className="work__head">
          <div>
            <Reveal>
              <p className="eyebrow">{site.work.eyebrow}</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="section-title">{site.work.title}</h2>
            </Reveal>
          </div>
          <Reveal delay={160}>
            <p className="lede" style={{ maxWidth: "32ch" }}>
              {site.work.lede}
            </p>
          </Reveal>
        </div>

        <div className="explainer">
          <ZealExplainer
            pose="zeal-pointing"
            targets=".card"
            height={430}
            describes="what we build"
            payload={["prop-receipt", "prop-browser", "prop-phone", "prop-audit"]}
          />

          <div className="work__grid explainer__body">
          {site.work.items.map((item, index) => (
            <Reveal
              key={item.title}
              className={SPAN_CLASS[item.size]}
              delay={index * 90}
              as="article"
              variant="scale"
            >
              {/* image slot - swap for a real product shot when one exists */}
              <div className="card__slot" data-slot={item.slot} aria-hidden="true" />
              <h3 className="card__title">{item.title}</h3>
              <p className="card__body">{item.body}</p>
              <div className="card__tags">
                {item.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </Reveal>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}
