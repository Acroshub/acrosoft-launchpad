import { Trash2, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import PriceListEditor, { type PriceEntry } from "@/components/crm/PriceListEditor";
import { PaymentMethodsDraftEditor } from "@/components/shared/PaymentMethodsEditor";
import type { CrmPaymentMethod } from "@/lib/supabase";
import { CURRENCIES, formatAmount } from "@/lib/currencies";

// Planes de precio reutilizables entre Cursos y Productos Digitales (Archivos):
// un plan puede ser de pago único o recurrente, con sus propios precios en
// otras monedas y métodos de pago.

export type RecurringInterval = "semanal" | "mensual" | "trimestral" | "semestral" | "anual" | null;

export const INTERVAL_OPTIONS = [
  { value: "semanal",    label: "Semanal" },
  { value: "mensual",    label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral",  label: "Semestral" },
  { value: "anual",      label: "Anual" },
] as const;
export const INTERVAL_LABELS: Record<string, string> = Object.fromEntries(INTERVAL_OPTIONS.map(o => [o.value, o.label]));

// Precio final de un plan (pago inicial) aplicando su descuento — este es el monto que se cobra/muestra siempre.
export function planFinalPrice(plan: { price: number; discount_pct: number }): number {
  return plan.discount_pct > 0 ? plan.price * (1 - plan.discount_pct / 100) : plan.price;
}
// Precio final recurrente de un plan (si aplica), aplicando su propio descuento.
export function planFinalRecurringPrice(plan: { recurring_price: number | null; recurring_discount_pct: number }): number | null {
  if (plan.recurring_price == null) return null;
  return plan.recurring_discount_pct > 0 ? plan.recurring_price * (1 - plan.recurring_discount_pct / 100) : plan.recurring_price;
}

// Suma un intervalo de recurrencia a una fecha — usado para vencimientos de acceso y próximas renovaciones.
export function addInterval(date: Date, interval: RecurringInterval): Date {
  const d = new Date(date);
  switch (interval) {
    case "semanal": d.setDate(d.getDate() + 7); break;
    case "trimestral": d.setMonth(d.getMonth() + 3); break;
    case "semestral": d.setMonth(d.getMonth() + 6); break;
    case "anual": d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1); break; // mensual (y fallback)
  }
  return d;
}

export type DraftPlan = {
  _key: number;
  name: string;
  price: string;
  currency: string;
  discountPct: number;
  isRecurring: boolean;
  recurringPrice: string;
  recurringInterval: RecurringInterval;
  recurringDiscountPct: number;
  prices: PriceEntry[];
  paymentMethods: Partial<CrmPaymentMethod>[];
};

export const emptyDraftPlan = (key: number): DraftPlan => ({
  _key: key, name: "", price: "", currency: "USD", discountPct: 0,
  isRecurring: false, recurringPrice: "", recurringInterval: "mensual", recurringDiscountPct: 0,
  prices: [], paymentMethods: [],
});

export function PlanFields({ name, price, currency, discountPct, isRecurring, recurringPrice, recurringInterval, recurringDiscountPct, onChange }: {
  name: string; price: string; currency: string; discountPct: number;
  isRecurring: boolean; recurringPrice: string; recurringInterval: RecurringInterval; recurringDiscountPct: number;
  onChange: (patch: Partial<{
    name: string; price: string; currency: string; discountPct: number;
    isRecurring: boolean; recurringPrice: string; recurringInterval: RecurringInterval; recurringDiscountPct: number;
  }>) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-[11px] text-muted-foreground">Nombre del plan</label>
        <Input value={name} onChange={e => onChange({ name: e.target.value })} className="h-9 text-base md:text-sm font-medium" placeholder="Ej: Pago único, Plan mensual..." />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Precio</label>
          <Input type="number" min="0" step="0.01" value={price} onChange={e => onChange({ price: e.target.value })} placeholder="0.00" className="h-9 text-base md:text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Moneda</label>
          <select value={currency} onChange={e => onChange({ currency: e.target.value })}
            className="h-9 w-full rounded-xl border border-border bg-background text-base md:text-xs px-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Descuento (%)</label>
          <Input type="number" min={0} max={99} value={discountPct || ""}
            onChange={e => onChange({ discountPct: Math.min(99, Math.max(0, parseFloat(e.target.value) || 0)) })}
            placeholder="0" className="h-9 text-base md:text-sm" />
        </div>
      </div>
      {discountPct > 0 && price !== "" && (
        <p className="text-xs text-primary font-medium -mt-2">
          Precio final: {formatAmount(parseFloat(price) * (1 - discountPct / 100), currency)}
        </p>
      )}

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <div onClick={() => onChange({ isRecurring: !isRecurring })}
          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${isRecurring ? "bg-primary" : "bg-secondary border"}`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isRecurring ? "translate-x-4" : ""}`} />
        </div>
        <span className="text-sm">Este plan tiene cobro recurrente</span>
      </label>

      {isRecurring && (
        <div className="grid grid-cols-2 gap-3 pl-1">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Monto recurrente ({currency})</label>
            <Input type="number" min="0" step="0.01" value={recurringPrice} onChange={e => onChange({ recurringPrice: e.target.value })} placeholder="0.00" className="h-9 text-base md:text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Intervalo</label>
            <select value={recurringInterval ?? "mensual"} onChange={e => onChange({ recurringInterval: e.target.value as RecurringInterval })}
              className="h-9 w-full rounded-xl border border-border bg-background text-base md:text-xs px-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
              {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-[11px] text-muted-foreground">Descuento recurrente (%)</label>
            <Input type="number" min={0} max={99} value={recurringDiscountPct || ""}
              onChange={e => onChange({ recurringDiscountPct: Math.min(99, Math.max(0, parseFloat(e.target.value) || 0)) })}
              placeholder="0" className="h-9 text-base md:text-sm" />
          </div>
          {recurringDiscountPct > 0 && recurringPrice !== "" && (
            <p className="text-xs text-primary font-medium col-span-2 -mt-2">
              Precio recurrente final: {formatAmount(parseFloat(recurringPrice) * (1 - recurringDiscountPct / 100), currency)}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export function DraftPlanCard({ plan, onChange, onRemove }: { plan: DraftPlan; onChange: (p: DraftPlan) => void; onRemove: () => void }) {
  return (
    <div className="bg-secondary/20 border rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{plan.name || "Nuevo plan"}</span>
        <button onClick={onRemove} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
      <PlanFields
        name={plan.name} price={plan.price} currency={plan.currency} discountPct={plan.discountPct}
        isRecurring={plan.isRecurring} recurringPrice={plan.recurringPrice} recurringInterval={plan.recurringInterval} recurringDiscountPct={plan.recurringDiscountPct}
        onChange={patch => onChange({ ...plan, ...patch })}
      />
      <div className="pt-2 border-t border-border/50 space-y-1.5">
        <label className="text-[11px] text-muted-foreground">Precio en otra moneda (opcional)</label>
        <PriceListEditor value={plan.prices} onChange={prices => onChange({ ...plan, prices })} baseCurrency={plan.currency} />
      </div>
      <div className="pt-2 border-t border-border/50 space-y-2">
        <div className="flex items-center gap-1.5">
          <CreditCard size={12} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Métodos de pago <span className="text-[10px] font-normal">(opcional)</span></span>
        </div>
        <PaymentMethodsDraftEditor value={plan.paymentMethods} onChange={paymentMethods => onChange({ ...plan, paymentMethods })} baseCurrency={plan.currency} />
      </div>
    </div>
  );
}
