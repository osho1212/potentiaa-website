"use client";

import LogoMark from "./LogoMark";
import { useContact } from "./ContactContext";
import { site } from "@/lib/site";

export default function Header() {
  const { open } = useContact();

  return (
    <header className="header">
      <div className="header__inner">
        <nav className="header__nav" aria-label="Primary">
          {site.nav.map((item) => (
            <a key={item.href} className="header__link" href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <a className="header__brand" href="#top" aria-label={`${site.name} home`}>
          <LogoMark className="header__logo" title={site.name} />
          <span className="header__wordmark">{site.name}</span>
        </a>

        <div className="header__actions">
          <button type="button" className="btn btn--primary" onClick={open}>
            Get in touch
          </button>
        </div>
      </div>
    </header>
  );
}
