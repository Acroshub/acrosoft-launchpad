import { CalendarDays, Check, CheckCircle, DollarSign, Filter, Settings2, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import OnboardingWizard from "@/components/crm/OnboardingWizard";
import { useState, useMemo, useEffect, useRef } from "react";
import { useContacts, useAppointments, useSales, useBusinessProfile, useUpsertBusinessProfile } from "@/hooks/useCrmData";
import { formatAmount, getCurrencyFlag } from "@/lib/currencies";

const fmtSaleAmt = formatAmount;

type Period = "7d" | "15d" | "30d" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  "7d":    "Últimos 7 días",
  "15d":   "Últimos 15 días",
  "30d":   "Últimos 30 días",
  "month": "Mes actual",
};

const CURRENCY_LINE_COLORS = ["#1877F2", "#00a884", "#E67E22", "#9B59B6", "#E91E63", "#3498DB"];

type SalesChartSaleEntry = { product: string; amount: number; contact: string };
type SalesChartRow = { date: number } & Record<string, number | SalesChartSaleEntry[] | undefined>;

const SalesChartTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { dataKey?: string; payload: SalesChartRow }[];
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  // payload trae una entrada por cada moneda (línea) que tuvo venta ese día — hay que mostrarlas todas.
  const currencies = [...new Set(payload.map(p => String(p.dataKey)))];
  return (
    <div className="rounded-xl border bg-card px-3.5 py-2.5 shadow-lg text-xs space-y-2 min-w-[190px] max-w-[260px]">
      <p className="font-semibold text-foreground">
        {new Date(row.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
      </p>
      {currencies.map((cur, idx) => {
        const sales = (row[`${cur}__sales`] as SalesChartSaleEntry[] | undefined) ?? [];
        const total = (row[cur] as number | undefined) ?? 0;
        return (
          <div key={cur} className={idx > 0 ? "pt-2 border-t space-y-1" : "space-y-1"}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">
              {getCurrencyFlag(cur)} {cur}
            </p>
            {sales.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground truncate">{s.product}</span>
                <span className="text-foreground font-medium shrink-0">{formatAmount(s.amount, cur)}</span>
              </div>
            ))}
            {sales.length > 1 && (
              <div className="flex items-center justify-between gap-2 pt-0.5 border-t">
                <span className="text-muted-foreground font-semibold">Total</span>
                <span className="text-primary font-semibold">{formatAmount(total, cur)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const FilterSelect = ({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 pl-2.5 pr-6 rounded-lg border border-border bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer truncate"
    >
      {children}
    </select>
    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  </div>
);

const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type View = "overview" | "mi_cuenta" | "business" | "servicios" | "productos" | "calendar" | "forms" | "contacts"
  | "ventas" | "settings" | "soporte" | "videos" | "agente_ia";

const CrmOverview = ({ onNavigate }: {
  onNavigate?: (view: View) => void;
}) => {
  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();
  const { data: salesData = [] } = useSales();

  const { data: businessProfile } = useBusinessProfile();
  const upsertProfile = useUpsertBusinessProfile();

  const [mobileOrder, setMobileOrder] = useState<"ventas" | "citas">("ventas");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState<Period>("month");
  const orderInitialized = useRef(false);

  useEffect(() => {
    if (!businessProfile || orderInitialized.current) return;
    orderInitialized.current = true;
    const saved = Array.isArray(businessProfile.metrics_order) ? businessProfile.metrics_order as string[] : [];
    if (saved[0] === "citas") setMobileOrder("citas");
  }, [businessProfile]);

  const handleSetMobileOrder = (order: "ventas" | "citas") => {
    setMobileOrder(order);
    setCustomizeOpen(false);
    upsertProfile.mutate({ metrics_order: [order] });
  };

  const todayKey = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  const todayAppointments = useMemo(
    () => appointments.filter(a => a.date === todayKey && a.status === "confirmed"),
    [appointments, todayKey]
  );

  const weekAppointments = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Dom..6=Sáb
    const daysLeftInWeek = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEndKey = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysLeftInWeek));
    return appointments
      .filter(a => a.status === "confirmed" && a.date > todayKey && a.date <= weekEndKey)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return (a.hour * 60 + (a.minute ?? 0)) - (b.hour * 60 + (b.minute ?? 0));
      });
  }, [appointments, todayKey]);

  const confirmedSales = useMemo(
    () => salesData.filter(s => s.status !== "pending_review" && s.status !== "rejected"),
    [salesData]
  );

  const productOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of confirmedSales) set.add(s.course_name ?? s.service_name ?? s.product_name ?? "Venta");
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [confirmedSales]);

  const currencyOptions = useMemo(
    () => [...new Set(confirmedSales.map(s => s.currency ?? "USD"))],
    [confirmedSales]
  );

  const filteredSales = useMemo(() => {
    const now = new Date();
    const periodStart = filterPeriod === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - ({ "7d": 7, "15d": 15, "30d": 30 }[filterPeriod] as number) + 1);
    return confirmedSales.filter(s => {
      if (new Date(s.created_at) < periodStart) return false;
      if (filterCurrency !== "all" && (s.currency ?? "USD") !== filterCurrency) return false;
      if (filterProduct !== "all") {
        const label = s.course_name ?? s.service_name ?? s.product_name ?? "Venta";
        if (label !== filterProduct) return false;
      }
      return true;
    });
  }, [confirmedSales, filterPeriod, filterCurrency, filterProduct]);

  const totalPorMoneda = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filteredSales) { const c = s.currency ?? "USD"; map.set(c, (map.get(c) ?? 0) + s.amount); }
    return [...map.entries()];
  }, [filteredSales]);

  const salesChartCurrencies = useMemo(
    () => [...new Set(filteredSales.map(s => s.currency ?? "USD"))],
    [filteredSales]
  );

  const salesChartData = useMemo(() => {
    const rows = new Map<number, SalesChartRow>();
    for (const s of filteredSales) {
      const d = new Date(s.created_at);
      const dayTs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const currency = s.currency ?? "USD";
      if (!rows.has(dayTs)) rows.set(dayTs, { date: dayTs });
      const row = rows.get(dayTs)!;
      const salesKey = `${currency}__sales`;
      const prevTotal = (row[currency] as number | undefined) ?? 0;
      const prevSales = (row[salesKey] as SalesChartSaleEntry[] | undefined) ?? [];
      row[currency] = prevTotal + s.amount;
      row[salesKey] = [...prevSales, {
        product: s.course_name ?? s.service_name ?? s.product_name ?? "Venta",
        amount: s.amount,
        contact: s.contact_name ?? "—",
      }];
    }
    return [...rows.values()].sort((a, b) => a.date - b.date);
  }, [filteredSales]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <div className="relative shrink-0 lg:hidden">
          <button
            onClick={() => setCustomizeOpen(o => !o)}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              customizeOpen
                ? "bg-primary text-white shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            }`}
          >
            <Settings2 size={13} />
            <span className="hidden sm:inline">Personalizar</span>
          </button>
          {customizeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCustomizeOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-card border rounded-2xl shadow-lg overflow-hidden py-1">
                <p className="px-3.5 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Orden en móvil</p>
                <button
                  onClick={() => handleSetMobileOrder("ventas")}
                  className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Ventas primero
                  {mobileOrder === "ventas" && <Check size={14} className="text-primary shrink-0" />}
                </button>
                <button
                  onClick={() => handleSetMobileOrder("citas")}
                  className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Citas primero
                  {mobileOrder === "citas" && <Check size={14} className="text-primary shrink-0" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Onboarding ── */}
      {onNavigate && (
        <OnboardingWizard onNavigate={onNavigate} />
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">

      {/* ── Grupo Ventas ── */}
      <div className={`bg-card border rounded-2xl overflow-hidden ${mobileOrder === "citas" ? "order-2" : "order-1"} lg:order-1`}>
        <div className="px-5 py-4 border-b flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp size={13} className="text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Ventas</h2>
        </div>

        {/* Filtros */}
        <div className="px-5 py-4 border-b">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Filter size={11} className="text-muted-foreground/40" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Filtros</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[130px] flex-1">
              <p className="text-[10px] text-muted-foreground/60 mb-1">Producto</p>
              <FilterSelect value={filterProduct} onChange={setFilterProduct}>
                <option value="all">Todos los productos</option>
                {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </FilterSelect>
            </div>
            <div className="min-w-[130px] flex-1">
              <p className="text-[10px] text-muted-foreground/60 mb-1">Moneda</p>
              <FilterSelect value={filterCurrency} onChange={setFilterCurrency}>
                <option value="all">Todas las monedas</option>
                {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </FilterSelect>
            </div>
            <div className="min-w-[130px] flex-1">
              <p className="text-[10px] text-muted-foreground/60 mb-1">Periodo</p>
              <FilterSelect value={filterPeriod} onChange={(v) => setFilterPeriod(v as Period)}>
                <option value="7d">Últimos 7 días</option>
                <option value="15d">Últimos 15 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="month">Mes actual</option>
              </FilterSelect>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Métricas rápidas */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border rounded-xl p-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <CheckCircle size={13} className="text-primary" />
              </div>
              <p className="text-xl font-bold text-foreground leading-tight">{filteredSales.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Ventas · {PERIOD_LABELS[filterPeriod]}</p>
            </div>

            {(totalPorMoneda.length > 0 ? totalPorMoneda : ([["USD", 0]] as [string, number][])).map(([cur, total]) => (
              <div key={`total-${cur}`} className="bg-card border rounded-xl p-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <DollarSign size={13} className="text-primary" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm leading-none">{getCurrencyFlag(cur)}</span>
                  <p className="text-xl font-bold text-foreground leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total {cur} · {PERIOD_LABELS[filterPeriod]}</p>
              </div>
            ))}
          </div>

          {/* Gráfica */}
          {salesChartData.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
                <TrendingUp size={18} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sin ventas en este periodo</p>
              <p className="text-xs text-muted-foreground/60">Prueba con otro filtro o periodo.</p>
            </div>
          ) : (
            <div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                    <XAxis
                      dataKey="date"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(v) => new Date(v).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      width={50}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      className="text-muted-foreground"
                      tickFormatter={(v) => Number(v).toLocaleString("es-ES")}
                    />
                    <Tooltip content={<SalesChartTooltip />} />
                    {salesChartCurrencies.map((cur, i) => (
                      <Line
                        key={cur}
                        type="monotone"
                        dataKey={cur}
                        name={cur}
                        stroke={CURRENCY_LINE_COLORS[i % CURRENCY_LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {salesChartCurrencies.length > 1 && (
                <div className="flex items-center gap-4 pt-3 flex-wrap">
                  {salesChartCurrencies.map((cur, i) => (
                    <div key={cur} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CURRENCY_LINE_COLORS[i % CURRENCY_LINE_COLORS.length] }} />
                      {getCurrencyFlag(cur)} {cur}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Grupo Citas ── */}
      <div className={`bg-card border rounded-2xl overflow-hidden ${mobileOrder === "citas" ? "order-1" : "order-2"} lg:order-2`}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Citas</h2>
          {(todayAppointments.length + weekAppointments.length) > 0 && (
            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {todayAppointments.length + weekAppointments.length}
            </span>
          )}
        </div>
        {todayAppointments.length === 0 && weekAppointments.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
              <CalendarDays size={18} className="text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Sin citas programadas</p>
            <p className="text-xs text-muted-foreground/60">Las citas confirmadas aparecerán aquí.</p>
          </div>
        ) : (
          <>
            <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Hoy</p>
            {todayAppointments.length === 0 ? (
              <p className="px-5 pb-3 text-xs text-muted-foreground/60">Sin citas para hoy.</p>
            ) : (
              <div className="divide-y">
                {todayAppointments.map((a) => {
                  const contact = contacts.find(c => c.id === a.contact_id);
                  return (
                    <div key={a.id} className="px-4 py-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary leading-none">
                          {String(a.hour).padStart(2, "0")}
                        </span>
                        <span className="text-[9px] text-primary/60 leading-none mt-0.5">
                          :{String(a.minute ?? 0).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{contact?.name ?? "Sin contacto"}</p>
                        {a.service && <p className="text-xs text-muted-foreground truncate">{a.service}</p>}
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}

            <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 border-t">Esta semana</p>
            {weekAppointments.length === 0 ? (
              <p className="px-5 pb-4 text-xs text-muted-foreground/60">Sin más citas esta semana.</p>
            ) : (
              <div className="divide-y pb-1">
                {weekAppointments.map((a) => {
                  const contact = contacts.find(c => c.id === a.contact_id);
                  const d = new Date(`${a.date}T00:00:00`);
                  return (
                    <div key={a.id} className="px-4 py-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-muted-foreground leading-none uppercase">
                          {d.toLocaleDateString("es-ES", { weekday: "short" })}
                        </span>
                        <span className="text-xs font-bold text-foreground leading-none mt-0.5">
                          {d.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{contact?.name ?? "Sin contacto"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {String(a.hour).padStart(2, "0")}:{String(a.minute ?? 0).padStart(2, "0")}{a.service ? ` · ${a.service}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      </div>

    </div>
  );
};

export default CrmOverview;
