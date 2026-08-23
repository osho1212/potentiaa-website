import Reveal from "../Reveal";
import { site } from "@/lib/site";

/** The three-module glyph with `active` modules lit, mirroring the logo. */
function StepModules({ active }: { active: number }) {
  return (
    <div className="step__modules" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`step__module ${n <= active ? `step__module--on-${n}` : ""}`}
          /* Stepped on the --space-* scale, not raw px. */
          style={{ marginBottom: `calc(var(--space-2) * ${n - 1})` }}
        />
      ))}
    </div>
  );
}

export default function Process({ clone }: { clone?: boolean }) {
  return (
    <section className="section" id={clone ? undefined : "process"} data-theme-key="process">
      <div className="container">
        <Reveal>
          <p className="eyebrow">{site.process.eyebrow}</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="section-title">{site.process.title}</h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="lede" style={{ marginTop: "var(--space-4)" }}>
            {site.process.lede}
          </p>
        </Reveal>

        {/* No Zeal here, deliberately. The craft critic cut this placement: the
            thinking pose was byte-identical across all three steps, drew no
            connector and looked at nothing - "delete the three cards and the
            pose reads exactly the same", which is bar.md M8's stated failure
            condition. Three consecutive sections with a mascot in the same left
            gutter also trains the eye to stop looking there. Two appearances
            with different jobs is restraint; three where the last does no job is
            a tic. This section is the free cut, and it lets the CTA arrive on a
            breath. */}
        <div className="process__grid">
            {site.process.steps.map((step, index) => (
              <Reveal
                className="step"
                key={step.name}
                delay={index * 110}
                variant="rise"
              >
                <StepModules active={step.active} />
                <h3 className="step__title">{step.name}</h3>
                <p className="step__body">{step.body}</p>
              </Reveal>
            ))}
        </div>
      </div>
    </section>
  );
}
