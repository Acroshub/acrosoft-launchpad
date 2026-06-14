import { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { CURRENCIES, getCurrencyFlag, getCurrencySymbol } from "@/lib/currencies";

export type PriceEntry = { currency: string; price: number };

interface Props {
  value: PriceEntry[];
  onChange: (entries: PriceEntry[]) => void;
  baseCurrency?: string;
}

export default function PriceListEditor({ value, onChange, baseCurrency }: Props) {
  const [adding, setAdding]     = useState(false);
  const [addCur, setAddCur]     = useState("");
  const [addPrice, setAddPrice] = useState("");

  const usedCurrencies      = new Set(value.map(e => e.currency));
  const availableCurrencies = CURRENCIES.filter(c => !usedCurrencies.has(c.code) && c.code !== baseCurrency);

  const handleConfirmAdd = () => {
    const cur   = addCur;
    const price = parseFloat(addPrice);
    if (!cur || isNaN(price) || price <= 0) return;
    onChange([...value, { currency: cur, price }]);
    setAdding(false);
    setAddCur("");
    setAddPrice("");
  };

  const handleCancelAdd = () => {
    setAdding(false);
    setAddCur("");
    setAddPrice("");
  };

  const handleUpdate = (idx: number, raw: string) => {
    const price = parseFloat(raw);
    if (isNaN(price) || price < 0) return;
    const next = [...value];
    next[idx]  = { ...next[idx], price };
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {/* Entradas existentes */}
      {value.map((entry, idx) => (
        <div key={entry.currency} className="flex items-center gap-2">
          <span className="text-sm leading-none">{getCurrencyFlag(entry.currency)}</span>
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
              onChange={e => handleUpdate(idx, e.target.value)}
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

      {/* Formulario para agregar — solo visible al hacer clic en "+" */}
      {adding ? (
        <div className="rounded-lg border border-border/60 bg-secondary/20 p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={addCur}
              onChange={e => setAddCur(e.target.value)}
              className="h-8 pl-2 pr-1 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer shrink-0"
              autoFocus
            >
              <option value="">Moneda…</option>
              {availableCurrencies.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
              ))}
            </select>
            <div className="relative flex-1">
              {addCur && (
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {getCurrencySymbol(addCur)}
                </span>
              )}
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={addPrice}
                onChange={e => setAddPrice(e.target.value)}
                placeholder="0.00"
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); handleConfirmAdd(); }
                  if (e.key === "Escape") handleCancelAdd();
                }}
                className={`w-full h-8 ${addCur ? "pl-7" : "pl-3"} pr-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all`}
              />
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
