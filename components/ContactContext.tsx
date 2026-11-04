"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ContactValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const ContactContext = createContext<ContactValue | null>(null);

export function ContactProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  /* A link ending in ?contact=1 (the QR code on printed material) opens the
     form on arrival. The parameter is removed once used, so a refresh or a
     shared URL does not reopen it. */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("contact") !== "1") return;
    setIsOpen(true);
    url.searchParams.delete("contact");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return <ContactContext.Provider value={value}>{children}</ContactContext.Provider>;
}

export function useContact(): ContactValue {
  const ctx = useContext(ContactContext);
  if (!ctx) {
    throw new Error("useContact must be used inside <ContactProvider>");
  }
  return ctx;
}
