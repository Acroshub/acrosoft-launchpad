import { useMemo, useState } from "react";
import { CheckCircle, DollarSign, Filter, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatAmount, getCurrencyFlag } from "@/lib/currencies";
import type { CrmSale } from "@/lib/supabase";
import DateRangePicker, { type DateRange } from "@/components/crm/DateRangePicker";

const fmtSaleAmt = formatAmount;

const fmtRangeLabel = (r: DateRange) => {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${r.from.toLocaleDateString("es-ES", opts)} – ${r.to.toLocaleDateString("es-ES", opts)}`;
};

const getDefaultSalesRange = (): DateRange => {
  const to = new Date(); to.setHours(23, 59, 59, 999);
  return { from: new Date(to.getFullYear(), to.getMonth(), 1), to };
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
      className="w-full h-8 pl-2.5 pr-6 rounded-lg border border-border bg-background text-base md:text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer truncate"
    >
      {children}
    </select>
    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  </div>
);

const SalesTrendCard = ({ sales, className = "" }: { sales: CrmSale[]; className?: string }) => {
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterRange, setFilterRange] = useState<DateRange>(getDefaultSalesRange);

  const confirmedSales = useMemo(
    () => sales.filter(s => s.status !== "pending_review" && s.status !== "rejected"),
    [sales]
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
    return confirmedSales.filter(s => {
      const created = new Date(s.created_at);
      if (created < filterRange.from || created > filterRange.to) return false;
      if (filterCurrency !== "all" && (s.currency ?? "USD") !== filterCurrency) return false;
      if (filterProduct !== "all") {
        const label = s.course_name ?? s.service_name ?? s.product_name ?? "Venta";
        if (label !== filterProduct) return false;
      }
      return true;
    });
  }, [confirmedSales, filterRange, filterCurrency, filterProduct]);

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

  return (
    <div className={`bg-card border rounded-2xl ${className}`}>
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
          <div className="min-w-[230px] flex-1">
            <p className="text-[10px] text-muted-foreground/60 mb-1">Periodo</p>
            <DateRangePicker value={filterRange} onChange={setFilterRange} />
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
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Ventas · {fmtRangeLabel(filterRange)}</p>
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
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total {cur} · {fmtRangeLabel(filterRange)}</p>
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
  );
};

export default SalesTrendCard;
