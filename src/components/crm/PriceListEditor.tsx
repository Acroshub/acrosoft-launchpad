import { useState } from "react";
import { Plus, Trash2, Check, X, Tag } from "lucide-react";
import { CURRENCIES, getCurrencyFlag, getCurrencySymbol } from "@/lib/currencies";

export type PriceEntry = { currency: string; price: number; discount_pct?: number | null };

interface Props {
  value: PriceEntry[];
  onChange: (entries: PriceEntry[]) => void;
  baseCurrency?: string;
}

function PriceInput({
  symbol,
  value,
  onChange,
  onKeyDown,
  placeholder = "0.00",
  min = 0,
  step = "0.01",
  autoFocus,
}: {
  symbol?: string;
  value: string | number;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  min?: number;
  step?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center h-8 rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all overflow-hidden flex-1 min-w-0">
      {symbol && (
        <span className="pl-2.5 pr-1 text-xs text-muted-foreground shrink-0 select-none whitespace-nowrap border-r border-border/50 h-full flex items-center">
          {symbol}
        </span>
      )}
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 h-full bg-transparent text-sm outline-none px-2.5 min-w-0"
      />
    </div>
  );
}

export default function PriceListEditor({ value, onChange, baseCurrency }: Props) {
  const [adding, setAdding]           = useState(false);
  const [addCur, setAddCur]           = useState("");
  const [addPrice, setAddPrice]       = useState("");
  const [addDiscount, setAddDiscount] = useState("");

  const usedCurrencies      = new Set(value.map(e => e.currency));
  const availableCurrencies = CURRENCIES.filter(c => !usedCurrencies.has(c.code) && c.code !== baseCurrency);

  const handleConfirmAdd = () => {
    const cur      = addCur;
    const price    = parseFloat(addPrice);
    const discount = addDiscount !== "" ? parseFloat(addDiscount) : null;
    if (!cur || isNaN(price) || price <= 0) return;
    onChange([...value, { currency: cur, price, discount_pct: discount !== null && !isNaN(discount) ? discount : null }]);
    setAdding(false);
    setAddCur("");
    setAddPrice("");
    setAddDiscount("");
  };

  const handleCancelAdd = () => {
    setAdding(false);
    setAddCur("");
    setAddPrice("");
    setAddDiscount("");
  };

  const handleUpdatePrice = (idx: number, raw: string) => {
    const price = parseFloat(raw);
    if (isNaN(price) || price < 0) return;
    const next = [...value];
    next[idx]  = { ...next[idx], price };
    onChange(next);
  };

  const handleUpdateDiscount = (idx: number, raw: string) => {
    const next = [...value];
    if (raw === "") {
      next[idx] = { ...next[idx], discount_pct: null };
    } else {
      const pct = parseFloat(raw);
      if (isNaN(pct) || pct < 0 || pct > 100) return;
      next[idx] = { ...next[idx], discount_pct: pct };
    }
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {/* Entradas existentes */}
      {value.map((entry, idx) => (
        <div key={entry.currency} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm leading-none">{getCurrencyFlag(entry.currency)}</span>
            <span className="w-10 text-xs font-semibold text-muted-foreground shrink-0">{entry.currency}</span>
            {/* Precio */}
            <PriceInput
              symbol={getCurrencySymbol(entry.currency)}
              value={entry.price}
              onChange={raw => handleUpdatePrice(idx, raw)}
            />
            {/* Descuento */}
            <div className="relative w-24 shrink-0">
              <Tag size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="number"
                min={0}
                max={100}
                step="1"
                value={entry.discount_pct ?? ""}
                onChange={e => handleUpdateDiscount(idx, e.target.value)}
                placeholder="0%"
                title="Descuento para esta moneda (%)"
                className="w-full h-8 pl-6 pr-5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">%</span>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
            >
              <Trash2 size={12} />
            </button>
          </div>
          {/* Indicador de precio final con descuento */}
          {entry.discount_pct != null && entry.discount_pct > 0 && (
            <p className="text-[10px] text-primary ml-14">
              Precio final: {getCurrencySymbol(entry.currency)}{(entry.price * (1 - entry.discount_pct / 100)).toFixed(2)} ({entry.discount_pct}% off)
            </p>
          )}
        </div>
      ))}

      {/* Formulario para agregar */}
      {adding ? (
        <div className="rounded-lg border border-border/60 bg-secondary/20 p-2.5 space-y-2">
          {/* Fila 1: selector de moneda */}
          <select
            value={addCur}
            onChange={e => setAddCur(e.target.value)}
            className="w-full h-8 pl-2 pr-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
            autoFocus
          >
            <option value="">Selecciona una moneda…</option>
            {availableCurrencies.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
            ))}
          </select>
          {/* Fila 2: precio + descuento + botones */}
          <div className="flex items-center gap-2">
            <PriceInput
              symbol={addCur ? getCurrencySymbol(addCur) : undefined}
              value={addPrice}
              onChange={setAddPrice}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); handleConfirmAdd(); }
                if (e.key === "Escape") handleCancelAdd();
              }}
              min={0.01}
            />
            {/* Descuento */}
            <div className="relative w-28 shrink-0">
              <Tag size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="number"
                min={0}
                max={100}
                step="1"
                value={addDiscount}
                onChange={e => setAddDiscount(e.target.value)}
                placeholder="Descuento"
                title="Descuento (%)"
                className="w-full h-8 pl-6 pr-6 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">%</span>
            </div>
            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={!addCur || !addPrice || parseFloat(addPrice) <= 0}
              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
              title="Confirmar"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={handleCancelAdd}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors shrink-0 cursor-pointer"
              title="Cancelar"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        availableCurrencies.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-0.5 cursor-pointer"
          >
            <Plus size={12} className="shrink-0" />
            Agregar precio en otra moneda
          </button>
        )
      )}
    </div>
  );
}
