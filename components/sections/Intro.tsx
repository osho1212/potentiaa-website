import Reveal from "../Reveal";
import Marquee from "../Marquee";
import MagicBento from "../MagicBento";
import IntroCubes from "../IntroCubes";
import { site } from "@/lib/site";

export default function Intro() {
  const bentoItems = site.intro.problems.map((p) => ({
    index: p.index,
    title: p.quote,
    description: p.diagnosis,
  }));

  return (
    <section className="section intro-section" id="intro" data-theme-key="intro">
      <div className="container">
        <Marquee />

        <div className="intro__container-card">
          <IntroCubes />
          <div className="intro__content">
            <div className="intro__header">
              <Reveal>
                <p className="eyebrow intro__eyebrow">{site.intro.eyebrow}</p>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="intro__title">{site.intro.title}</h2>
              </Reveal>
            </div>

            <Reveal delay={120}>
              <MagicBento
                items={bentoItems}
                theme="light"
                textAutoHide={false}
                enableStars={true}
                enableSpotlight={true}
                enableBorderGlow={true}
                enableTilt={true}
                enableMagnetism={true}
                clickEffect={true}
                spotlightRadius={280}
                particleCount={8}
                glowColor="79, 70, 229"
              />
            </Reveal>

            <Reveal delay={280}>
              <div className="intro__punchline-card">
                <p className="intro__punchline">{site.intro.punchline}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
