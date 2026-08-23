import Reveal from "../Reveal";
import ZealExplainer from "../ZealExplainer";
import { site } from "@/lib/site";

export default function Services({ clone }: { clone?: boolean }) {
  return (
    <section className="section" id={clone ? undefined : "services"} data-theme-key="services">
      <div className="container">
        <Reveal>
          <p className="eyebrow">{site.services.eyebrow}</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="section-title">{site.services.title}</h2>
        </Reveal>

        <div className="explainer">
          <ZealExplainer
            pose="zeal-presenting"
            targets=".service"
            height={450}
            describes="the services list"
            payload={[
              "prop-audit",
              "prop-receipt",
              "prop-browser",
              "prop-phone",
              "prop-wrench",
            ]}
          />

          <div className="explainer__body">
            {site.services.groups.map((group, index) => (
              <Reveal
                key={group.title}
                className="service"
                delay={index * 80}
                variant="left"
              >
                <span className="service__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="service__title">{group.title}</h3>
                  <p className="service__items">{group.items}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
