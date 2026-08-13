import { useState, useRef, useEffect, useLayoutEffect, type CSSProperties } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export type DateRange = { from: Date; to: Date };

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay   = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const addDays    = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay    = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const fmtShort = (d: Date) => `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;

export const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getMaxDateRange = (): DateRange => ({ from: new Date(2020, 0, 1), to: endOfDay(new Date()) });

type Preset = { label: string; range: () => DateRange };

function buildPresets(): Preset[] {
  const today = startOfDay(new Date());
  const back = (n: number) => addDays(today, -n);
  return [
    { label: "Hoy", range: () => ({ from: today, to: endOfDay(today) }) },
    { label: "Ayer", range: () => ({ from: back(1), to: endOfDay(back(1)) }) },
    { label: "Últimos 7 días", range: () => ({ from: back(6), to: endOfDay(today) }) },
    { label: "Últimos 30 días", range: () => ({ from: back(29), to: endOfDay(today) }) },
    { label: "Esta semana", range: () => {
      const dow = (today.getDay() + 6) % 7; // 0=lunes
      return { from: addDays(today, -dow), to: endOfDay(today) };
    } },
    { label: "La semana pasada", range: () => {
      const dow = (today.getDay() + 6) % 7;
      const thisMonday = addDays(today, -dow);
      return { from: addDays(thisMonday, -7), to: endOfDay(addDays(thisMonday, -1)) };
    } },
    { label: "Este mes", range: () => ({ from: new Date(today.getFullYear(), today.getMonth(), 1), to: endOfDay(today) }) },
    { label: "El mes pasado", range: () => ({
      from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      to: endOfDay(new Date(today.getFullYear(), today.getMonth(), 0)),
    }) },
    { label: "Máximo", range: () => ({ from: new Date(2020, 0, 1), to: endOfDay(today) }) },
  ];
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // Lun=0..Dom=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

const DateRangePicker = ({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [pickingSecond, setPickingSecond] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(() => value.to.getMonth());
  const [viewYear, setViewYear] = useState(() => value.to.getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Posición del popover en escritorio, calculada en JS y anclada al viewport (position: fixed)
  // en vez de al contenedor más cercano — así nunca queda recortado por un `overflow-hidden`/
  // `overflow-auto` ancestro (tarjetas angostas, paneles con scroll propio, etc.).
  const [desktopStyle, setDesktopStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setAnchor(null);
    setPickingSecond(false);
    setViewMonth(value.to.getMonth());
    setViewYear(value.to.getFullYear());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!open) { setDesktopStyle(null); return; }
    const compute = () => {
      if (window.innerWidth < 640 || !buttonRef.current) { setDesktopStyle(null); return; }
      const rect = buttonRef.current.getBoundingClientRect();
      const margin = 12;
      const width = Math.min(640, window.innerWidth * 0.9);
      const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
      const top = Math.min(rect.bottom + 8, window.innerHeight - margin);
      setDesktopStyle({ position: "fixed", top, left, width, right: "auto", bottom: "auto", transform: "none" });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open]);

  const presets = buildPresets();

  const matchingPreset = presets.find(p => {
    const r = p.range();
    return sameDay(r.from, draft.from) && sameDay(r.to, draft.to);
  })?.label ?? null;

  const handlePickDate = (d: Date) => {
    if (!pickingSecond) {
      setAnchor(d);
      setDraft({ from: startOfDay(d), to: endOfDay(d) });
      setPickingSecond(true);
    } else {
      const a = anchor ?? d;
      if (d >= a) setDraft({ from: startOfDay(a), to: endOfDay(d) });
      else setDraft({ from: startOfDay(d), to: endOfDay(a) });
      setPickingSecond(false);
      setAnchor(null);
    }
  };

  const previewTo = pickingSecond && anchor && hoverDate ? hoverDate : null;
  const rangeStart = pickingSecond && anchor && previewTo ? (previewTo >= anchor ? anchor : previewTo) : draft.from;
  const rangeEnd   = pickingSecond && anchor && previewTo ? (previewTo >= anchor ? previewTo : anchor) : draft.to;

  const isInRange = (d: Date) => startOfDay(d) >= startOfDay(rangeStart) && startOfDay(d) <= startOfDay(rangeEnd);
  const isEdge = (d: Date) => sameDay(d, rangeStart) || sameDay(d, rangeEnd);

  const grid = buildMonthGrid(viewYear, viewMonth);

  const goPrevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const goNextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const apply = () => { onChange(draft); setOpen(false); };
  const cancel = () => setOpen(false);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border rounded-md px-3 py-1.5 text-sm bg-background hover:bg-muted/50 transition-colors whitespace-nowrap"
      >
        <Calendar size={14} className="text-muted-foreground shrink-0" />
        <span className="font-medium">{fmtShort(value.from)} – {fmtShort(value.to)}</span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent" onClick={cancel} />
          <div
            className="fixed inset-x-3 top-1/2 -translate-y-1/2 z-50 bg-card border rounded-2xl shadow-lg overflow-hidden flex flex-col sm:flex-row max-h-[85vh] sm:max-h-none"
            style={desktopStyle ?? undefined}
          >
            {/* Presets: franja horizontal con scroll en mobile, columna lateral en desktop */}
            <div className="flex sm:flex-col sm:w-40 sm:shrink-0 border-b sm:border-b-0 sm:border-r overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto sm:max-h-[420px] py-1.5 sm:py-2 px-1.5 sm:px-0 gap-1 sm:gap-0">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => setDraft(p.range())}
                  className={`shrink-0 sm:w-full flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full sm:rounded-none text-xs whitespace-nowrap sm:whitespace-normal text-left hover:bg-secondary/70 transition-colors ${
                    matchingPreset === p.label ? "font-semibold text-primary bg-primary/10 sm:bg-transparent" : ""
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border shrink-0 hidden sm:flex items-center justify-center ${
                    matchingPreset === p.label ? "border-primary" : "border-muted-foreground/40"
                  }`}>
                    {matchingPreset === p.label && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </span>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendario + acciones */}
            <div className="flex-1 flex flex-col overflow-y-auto sm:overflow-visible">
              <div className="flex items-center justify-between px-4 pt-3">
                <button onClick={goPrevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary/70">
                  <ChevronLeft size={15} />
                </button>
                <p className="text-sm font-semibold capitalize">{MONTHS_ES[viewMonth]} {viewYear}</p>
                <button onClick={goNextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary/70">
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="px-4 pt-2">
                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {DOW_ES.map(d => (
                    <div key={d} className="text-[10px] font-semibold text-muted-foreground/60 py-1">{d}</div>
                  ))}
                  {grid.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const inRange = isInRange(d);
                    const edge = isEdge(d);
                    return (
                      <button
                        key={i}
                        onClick={() => handlePickDate(d)}
                        onMouseEnter={() => setHoverDate(d)}
                        className={`text-xs h-8 rounded-lg transition-colors ${
                          edge ? "bg-primary text-white font-semibold"
                          : inRange ? "bg-primary/15 text-primary"
                          : "hover:bg-secondary/70"
                        }`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto px-4 py-3 border-t flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {fmtShort(draft.from)} – {fmtShort(draft.to)}
                </p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={cancel} className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-secondary/70">
                    Cancelar
                  </button>
                  <button onClick={apply} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90">
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangePicker;
