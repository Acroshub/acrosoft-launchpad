import { useState, useEffect } from "react";
import { Bot, Crown, CheckCircle2, Loader2, Pencil, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CrmSale } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SalesTableRow = {
  id: string;
  raw: CrmSale;
  dateStr: string;
  contactName: string;
  serviceName: string;
  notes: string;
  vendorId?: string;
  vendorName?: string;
  commission?: number;
};

type Props = {
  rows: SalesTableRow[];
  isLoading?: boolean;
  pageSize?: number;
  isSuperAdmin?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  emptyText?: string;
  // footer
  totalCount?: number;
  filteredTotal?: number;
  hasFilters?: boolean;
  // actions
  onEdit?: (sale: CrmSale) => void;
  onDelete?: (sale: CrmSale) => void;
  onToggleVip?: (sale: CrmSale) => void;
  onMarkPaid?: (sale: CrmSale) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£",
  BOB: "Bs.", PEN: "S/", COP: "COP$",
  MXN: "$", ARS: "$", CLP: "$", UYU: "$", PYG: "₲",
};

export function fmtSaleAmt(amount: number, currency?: string | null) {
  const sym = CURRENCY_SYMBOLS[currency ?? "USD"] ?? (currency ?? "$");
  return `${sym}${Number(amount).toFixed(2)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalesTable({
  rows,
  isLoading = false,
  pageSize = 15,
  isSuperAdmin = false,
  canEdit = false,
  canDelete = false,
  emptyText = "No hay ventas registradas.",
  totalCount,
  filteredTotal,
  hasFilters = false,
  onEdit,
  onDelete,
  onToggleVip,
  onMarkPaid,
}: Props) {
  const [page, setPage] = useState(1);

  // Reset to page 1 when filtered rows change
  useEffect(() => { setPage(1); }, [rows]);

  const totalPages = Math.ceil(rows.length / pageSize);
  const pageRows   = rows.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  );

  if (rows.length === 0) return (
    <div className="px-6 py-12 text-center text-muted-foreground">
      <DollarSign size={24} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm font-medium">{emptyText}</p>
    </div>
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-6 py-3 font-medium">Fecha</th>
              <th className="px-6 py-3 font-medium">Contacto</th>
              <th className="px-6 py-3 font-medium">Servicio / Producto</th>
              <th className="px-6 py-3 font-medium text-right">Monto</th>
              {isSuperAdmin && <th className="px-6 py-3 font-medium">Vendedor</th>}
              {isSuperAdmin && <th className="px-6 py-3 font-medium text-right">Comisión</th>}
              {isSuperAdmin && <th className="px-6 py-3 font-medium text-center">Pagado</th>}
              <th className="px-6 py-3 font-medium">Notas</th>
              {(onEdit || onDelete || onToggleVip) && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRows.map((sale) => {
              const s = sale.raw;
              const rowClass = s.status === "pending_review"
                ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 opacity-80"
                : s.status === "rejected"
                  ? "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/40 dark:hover:bg-red-900/15 opacity-60"
                  : sale.vendorId && (sale.commission ?? 0) > 0 && !s.is_paid
                    ? "bg-amber-50/70 dark:bg-amber-900/15 hover:bg-amber-100/60 dark:hover:bg-amber-900/25"
                    : "hover:bg-secondary/30";

              return (
                <tr key={sale.id} className={`transition-colors group ${rowClass}`}>
                  <td className="px-6 py-3 whitespace-nowrap text-muted-foreground text-xs">{sale.dateStr}</td>
                  <td className="px-6 py-3 font-medium">
                    <span className="flex items-center gap-2 flex-wrap">
                      {sale.contactName}
                      {s.is_vip && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700 shrink-0">
                          <Crown size={9} /> VIP
                        </span>
                      )}
                      {s.is_ai_sale && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700 shrink-0" title="Venta detectada por el Agente IA">
                          <Bot size={9} /> IA
                        </span>
                      )}
                      {s.status === "pending_review" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700 shrink-0">
                          Pendiente
                        </span>
                      )}
                      {s.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-700 shrink-0">
                          Rechazado
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-3">{sale.serviceName}</td>
                  <td className="px-6 py-3 font-semibold text-primary text-right">{fmtSaleAmt(sale.raw.amount, s.currency)}</td>
                  {isSuperAdmin && (
                    <td className="px-6 py-3">
                      {sale.vendorName
                        ? <span className="text-xs font-medium text-muted-foreground">{sale.vendorName}</span>
                        : <span className="text-xs text-muted-foreground/50">Directo</span>}
                    </td>
                  )}
                  {isSuperAdmin && (
                    <td className="px-6 py-3 text-right">
                      {(sale.commission ?? 0) > 0
                        ? <span className="text-xs font-medium text-emerald-600">{fmtSaleAmt(sale.commission!, s.currency)}</span>
                        : <span className="text-xs text-muted-foreground/50">—</span>}
                    </td>
                  )}
                  {isSuperAdmin && (
                    <td className="px-6 py-3 text-center">
                      {sale.vendorId && (sale.commission ?? 0) > 0 ? (
                        s.is_paid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 size={11} /> Pagado
                          </span>
                        ) : (
                          <button
                            onClick={() => onMarkPaid?.(s)}
                            className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-semibold"
                          >
                            Marcar pagado
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-3 text-muted-foreground text-xs truncate max-w-[160px]">{sale.notes || "—"}</td>
                  {(onEdit || onDelete || onToggleVip) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onToggleVip && isSuperAdmin && (
                          <button
                            onClick={() => onToggleVip(s)}
                            className={`p-1.5 rounded-lg transition-colors ${s.is_vip ? "text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30" : "text-muted-foreground hover:text-amber-500 hover:bg-secondary"}`}
                            title={s.is_vip ? "Quitar VIP" : "Marcar como VIP"}
                          >
                            <Crown size={13} />
                          </button>
                        )}
                        {canEdit && onEdit && (
                          <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Editar transacción">
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button onClick={() => onDelete(s)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar transacción">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: count + total + pagination */}
      <div className="px-6 py-3 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {totalCount !== undefined && totalCount !== rows.length
              ? `${rows.length} de ${totalCount} venta${totalCount !== 1 ? "s" : ""}`
              : `${rows.length} venta${rows.length !== 1 ? "s" : ""}`}
          </span>
          {hasFilters && filteredTotal !== undefined && (
            <span className="text-xs font-semibold text-primary">
              Total filtrado: {fmtSaleAmt(filteredTotal)}
            </span>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <div className="flex items-center mx-1">
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium transition-colors ${page === i + 1 ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        )}
      </div>
    </div>
  );
}
