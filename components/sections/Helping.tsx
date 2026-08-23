import Image from "next/image";
import Reveal from "../Reveal";
import scenes from "@/public/assets/mascot/scenes.json";
import { site } from "@/lib/site";

/**
 * The section that exists because of bar.md M9.
 *
 * Every other placement has Zeal pointing at a card or a row - a target, not a
 * beneficiary. The Brief critic's verdict was blunt: "there is not a single
 * human being depicted anywhere on this site... he is a mascot pointing at a
 * menu." No amount of positioning code fixes that, because every asset in the
 * library was a solo cut-out. These three frames are the only ones with a
 * second character in them, and this is the only place the mascot is doing
 * something FOR someone.
 *
 * Zeal also speaks here, for the only time. His contribution to the rest of the
 * site is zero words; a held wrench labelled "maintenance" restates the heading
 * rather than adding to it. Each `aside` says what the body copy does not.
 */
export default function Helping({ clone }: { clone?: boolean }) {
  return (
    <section className="section" id={clone ? undefined : "helping"} data-theme-key="helping">
      <div className="container">
        <Reveal>
          <p className="eyebrow">{site.helping.eyebrow}</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="section-title">{site.helping.title}</h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="lede" style={{ marginTop: "var(--space-4)" }}>
            {site.helping.lede}
          </p>
        </Reveal>

        <div className="beats">
          {site.helping.beats.map((beat, index) => {
            const art = scenes[beat.scene as keyof typeof scenes];
            return (
              <Reveal variant="blur" key={beat.stage} className="beat" delay={index * 110}>
                <div className="beat__scene">
                  <Image
                    src={art.src}
                    alt={`Zeal helping a small business owner: ${beat.title}`}
                    width={art.width}
                    height={art.height}
                    className="beat__art"
                    sizes="(max-width: 860px) 100vw, 33vw"
                  />
                </div>

                <p className="beat__stage">{beat.stage}</p>
                <h3 className="beat__title">{beat.title}</h3>
                <p className="beat__body">{beat.body}</p>

                {/* Zeal's own line - the only words he gets on the site. */}
                <p className="beat__aside">{beat.aside}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
