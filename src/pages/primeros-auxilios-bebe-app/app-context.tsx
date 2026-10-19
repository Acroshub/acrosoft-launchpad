import { createContext, useContext, useMemo, type ReactNode } from "react";
import { isStage } from "./logic";
import { usePersisted } from "./storage";
import type { PackContent, Stage } from "./types";

interface AppApi {
  content: PackContent;
  logout: () => void;
  stage: Stage | null;
  setStage: (s: Stage | null) => void;
  birth: string;
  setBirth: (iso: string) => void;
}

const Ctx = createContext<AppApi | null>(null);

export function AppProvider({ content, logout, children }: { content: PackContent; logout: () => void; children: ReactNode }) {
  const [stage, setStage] = usePersisted<Stage | null>("stage", null, (r) => (isStage(r) ? r : null));
  const [birth, setBirth] = usePersisted<string>("birth", "", (r) => (typeof r === "string" ? r.slice(0, 10) : ""));
  const value = useMemo<AppApi>(
    () => ({ content, logout, stage, setStage, birth, setBirth }),
    [content, logout, stage, setStage, birth, setBirth],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp fuera de AppProvider");
  return ctx;
}
