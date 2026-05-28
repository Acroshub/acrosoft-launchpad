import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CURRENCIES, getCurrencyFlag, getCurrencySymbol } from "@/lib/currencies";

export type PriceEntry = { currency: string; price: number };

interface Props {
  value: PriceEntry[];
  onChange: (entries: PriceEntry[]) => void;
  baseCurrency?: string;
}

export default function PriceListEditor({ value, onChange, baseCurrency }: Props) {
  const [open, setOpen]         = useState(() => value.length > 0);
  const [addCur, setAddCur]     = useState("");
  const [addPrice, setAddPrice] = useState("");

  const usedCurrencies      = new Set(value.map(e => e.currency));
  const availableCurrencies = CURRENCIES.filter(c => !usedCurrencies.has(c.code) && c.code !== baseCurrency);

  const handleAdd = () => {
    const cur   = addCur || availableCurrencies[0]?.code;
    const price = parseFloat(addPrice);
    if (!cur || isNaN(price) || price < 0) return;
    onChange([...value, { currency: cur, price }]);
    setAddCur("");
    setAddPrice("");
  };

  const handleUpdate = (idx: number, price: number) => {
    const next = [...value];
    next[idx]  = { ...next[idx], price };
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
    if (next.length === 0) setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1 cursor-pointer"
      >
        <Plus size={12} className="shrink-0" />
        Agregar precio en otra moneda
        <span className="opacity-50">(opcional)</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Precios en otras monedas</span>
        {value.length === 0 && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
          >
            ocultar
          </button>
        )}
      </div>

      {/* Existing entries */}
      {value.map((entry, idx) => (
        <div key={entry.currency} className="flex items-center gap-2">
          <span className="w-6 text-center text-sm leading-none">{getCurrencyFlag(entry.currency)}</span>
          <span className="w-10 text-xs font-semibold text-muted-foreground shrink-0">{entry.currency}</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              {getCurrencySymbol(entry.currency)}
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={entry.price}
              onChange={e => handleUpdate(idx, parseFloat(e.target.value) || 0)}
              className="w-full h-8 pl-7 pr-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      {/* Add row */}
      {availableCurrencies.length > 0 && (
        <div className="space-y-2 pt-1.5 border-t border-border/40">
          <div className="flex items-center gap-2">
            <select
              value={addCur || availableCurrencies[0]?.code}
              onChange={e => setAddCur(e.target.value)}
              className="h-8 pl-2 pr-1 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer shrink-0"
            >
              {availableCurrencies.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step="0.01"
              value={addPrice}
              onChange={e => setAddPrice(e.target.value)}
              placeholder="0.00"
              className="flex-1 min-w-0 h-8 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!addPrice || parseFloat(addPrice) < 0}
            className="w-full h-8 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={12} /> Agregar moneda
          </button>
        </div>
      )}
    </div>
  );
}
