import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AudioItem, LabContent, Section } from "./types";

interface LabApi {
  content: LabContent;
  itemsById: Readonly<Record<string, AudioItem>>;
  allIds: string[];
  logout: () => void;
}

const LabContext = createContext<LabApi | null>(null);

export function LabProvider({ content, logout, children }: { content: LabContent; logout: () => void; children: ReactNode }) {
  const value = useMemo<LabApi>(() => {
    const items = content.sections.flatMap((s: Section) => s.items);
    return { content, itemsById: Object.fromEntries(items.map((i) => [i.id, i])), allIds: items.map((i) => i.id), logout };
  }, [content, logout]);
  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab(): LabApi {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error("useLab fuera de LabProvider");
  return ctx;
}
