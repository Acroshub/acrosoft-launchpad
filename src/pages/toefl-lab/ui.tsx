import { Headphones } from "lucide-react";
import type { CSSProperties } from "react";

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={cx("tl-brand", large && "tl-brand-lg")}>
      <Headphones aria-hidden="true" />
      <span className="tl-brand-name">
        TOEFL <em>Audio Lab</em>
      </span>
    </div>
  );
}

export function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="tl-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>
      <span style={{ width: `${pct}%` } as CSSProperties} />
    </div>
  );
}
