import { site } from "@/lib/site";

export type LegalSection = {
  id: string;
  title: string;
  body: React.ReactNode;
};

/** "2026-10-14" -> "14 October 2026". UTC, so the day cannot slip at build time. */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/**
 * Shared frame for /privacy and /terms.
 *
 * Deliberately outside SiteShell: the legal pages are for reading, so they
 * skip the scroll engine, the frame-sequence background and the floating
 * module, and load as plain server-rendered text.
 */
export default function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  const year = new Date().getFullYear();

  return (
    <div className="legal">
      <header className="legal__bar">
        <a href="/" className="legal__brand" aria-label={`${site.name} home`}>
          <img src="/assets/img/logo-mark.png" alt="" className="legal__mark" />
          <span>{site.name}</span>
        </a>
        <a href="/" className="legal__back">
          &larr; Back to site
        </a>
      </header>

      <main className="legal__main">
        <div className="legal__head">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="legal__title">{title}</h1>
          <p className="legal__updated">
            Last updated: <time dateTime={site.legal.lastUpdated}>{formatDate(site.legal.lastUpdated)}</time>
          </p>
          <div className="legal__intro">{intro}</div>
        </div>

        <div className="legal__layout">
          <nav className="legal__toc" aria-label="On this page">
            <p className="legal__toc-label">On this page</p>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="legal__body">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="legal__section">
                <h2>
                  <span className="legal__num">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </article>
        </div>
      </main>

      <footer className="legal__foot">
        <span>&copy; {year} {site.legal.entityName}. All rights reserved.</span>
        <nav aria-label="Legal">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms &amp; Conditions</a>
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
        </nav>
      </footer>
    </div>
  );
}
