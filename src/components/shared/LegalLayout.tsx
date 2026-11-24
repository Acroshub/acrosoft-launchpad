import type { ReactNode } from "react";
import { LEGAL } from "@/lib/legal";

/** Estructura común de las páginas legales públicas en inglés (Privacy Policy y Terms & Conditions). */
export const LegalLayout = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {LEGAL.updated} · {LEGAL.brand}
        </p>
      </header>

      {children}

      <footer className="pt-6 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        <span>© {new Date().getFullYear()} {LEGAL.brand}</span>
        <a href={LEGAL.privacyPath} className="underline underline-offset-2">Privacy Policy</a>
        <a href={LEGAL.termsPath} className="underline underline-offset-2">Terms and Conditions</a>
        <a href={`mailto:${LEGAL.supportEmail}`} className="underline underline-offset-2">{LEGAL.supportEmail}</a>
      </footer>
    </main>
  </div>
);

export const LegalSection = ({ id, title, children }: { id?: string; title: string; children: ReactNode }) => (
  <section id={id} className="space-y-3">
    <h2 className="text-lg font-bold">{title}</h2>
    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
  </section>
);

export const LegalList = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc list-inside space-y-1 pl-2">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);
