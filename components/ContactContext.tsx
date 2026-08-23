"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ContactValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const ContactContext = createContext<ContactValue | null>(null);

export function ContactProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

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
