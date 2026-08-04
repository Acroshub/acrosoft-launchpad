import { RefreshCcw, AlertTriangle } from "lucide-react";
import { formatAmount } from "@/lib/currencies";
import type { CrmSale, CrmContact } from "@/lib/supabase";

const fmtAmt = (amount: number, currency?: string | null) => formatAmount(amount, currency);

const renewalDueLabel = (dateStr: string) => {
  const due = new Date(`${dateStr}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? "s" : ""}`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days} días`;
};

// Por cada suscripción (contacto + servicio/plan) toma solo la venta más reciente —esa es la que
// tiene la fecha de renovación vigente.
function latestPerSubscription(sales: CrmSale[]): CrmSale[] {
  const latestBySub = new Map<string, CrmSale>();
  for (const s of sales) {
    if (!s.next_renewal_date || !s.contact_id) continue;
    const entityId = s.service_id ?? s.course_plan_id ?? s.product_plan_id;
    if (!entityId) continue;
    const key = `${s.contact_id}|${entityId}`;
    const existing = latestBySub.get(key);
    if (!existing || new Date(s.created_at) > new Date(existing.created_at)) {
      latestBySub.set(key, s);
    }
  }
  return [...latestBySub.values()];
}

// Suscripciones cuya renovación cae dentro de los próximos 7 días, sin incluir las ya vencidas
// (esas viven aparte en getOverdueRenewals para que no se acumulen en el mismo panel).
export function getUpcomingRenewals(sales: CrmSale[]): CrmSale[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + 7); cutoff.setHours(23, 59, 59, 999);
  return latestPerSubscription(sales)
    .filter(s => {
      const d = new Date(`${s.next_renewal_date}T00:00:00`);
      return d >= today && d <= cutoff;
    })
    .sort((a, b) => new Date(a.next_renewal_date!).getTime() - new Date(b.next_renewal_date!).getTime());
}

// Suscripciones cuya fecha de renovación ya pasó.
export function getOverdueRenewals(sales: CrmSale[]): CrmSale[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return latestPerSubscription(sales)
    .filter(s => new Date(`${s.next_renewal_date}T00:00:00`) < today)
    .sort((a, b) => new Date(a.next_renewal_date!).getTime() - new Date(b.next_renewal_date!).getTime());
}

type RenewalVariant = "upcoming" | "overdue";

const VARIANT: Record<RenewalVariant, {
  title: string; subtitle: string; icon: typeof RefreshCcw;
  border: string; bg: string; iconBg: string; iconColor: string;
  titleColor: string; subtitleColor: string; badgeBg: string; badgeColor: string;
  divide: string; buttonBg: string; buttonHoverBg: string; dueLabelColor: string;
}> = {
  upcoming: {
    title: "Renovaciones próximas",
    subtitle: "Pagos recurrentes por registrar manualmente",
    icon: RefreshCcw,
    border: "border-amber-200", bg: "bg-amber-50",
    iconBg: "bg-amber-500/15", iconColor: "text-amber-600",
    titleColor: "text-amber-800", subtitleColor: "text-amber-600",
    badgeBg: "bg-amber-500/15", badgeColor: "text-amber-700",
    divide: "divide-amber-100",
    buttonBg: "bg-amber-500", buttonHoverBg: "hover:bg-amber-600",
    dueLabelColor: "text-amber-700",
  },
  overdue: {
    title: "Renovaciones vencidas",
    subtitle: "Ya pasó la fecha de renovación — regístralas cuando corresponda",
    icon: AlertTriangle,
    border: "border-red-200", bg: "bg-red-50",
    iconBg: "bg-red-500/15", iconColor: "text-red-600",
    titleColor: "text-red-800", subtitleColor: "text-red-600",
    badgeBg: "bg-red-500/15", badgeColor: "text-red-700",
    divide: "divide-red-100",
    buttonBg: "bg-red-500", buttonHoverBg: "hover:bg-red-600",
    dueLabelColor: "text-red-700",
  },
};

const RenewalsPanel = ({
  sales, contacts, onActionClick, actionLabel = "Registrar renovación", className = "", variant = "upcoming",
}: {
  sales: CrmSale[];
  contacts: CrmContact[];
  onActionClick: (sale: CrmSale) => void;
  actionLabel?: string;
  className?: string;
  variant?: RenewalVariant;
}) => {
  const renewals = variant === "overdue" ? getOverdueRenewals(sales) : getUpcomingRenewals(sales);
  if (renewals.length === 0) return null;
  const v = VARIANT[variant];
  const Icon = v.icon;

  return (
    <div className={`border ${v.border} ${v.bg} rounded-2xl overflow-hidden ${className}`}>
      <div className={`px-5 py-4 border-b ${v.border} flex items-center gap-2.5`}>
        <div className={`w-8 h-8 rounded-xl ${v.iconBg} flex items-center justify-center shrink-0`}>
          <Icon size={15} className={v.iconColor} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${v.titleColor}`}>{v.title}</p>
          <p className={`text-xs ${v.subtitleColor}`}>{v.subtitle}</p>
        </div>
        <span className={`ml-auto text-xs font-bold ${v.badgeBg} ${v.badgeColor} px-2 py-0.5 rounded-full`}>
          {renewals.length}
        </span>
      </div>
      <div className={`divide-y ${v.divide}`}>
        {renewals.map(s => {
          const contact = contacts.find(c => c.id === s.contact_id);
          const itemName = s.course_name ?? s.product_name ?? s.service_name ?? "—";
          return (
            <div key={s.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{contact?.name ?? s.contact_name ?? "Cliente"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {itemName} · {fmtAmt(s.next_renewal_amount ?? 0, s.next_renewal_currency)}
                </p>
                <p className={`text-[11px] font-medium mt-0.5 ${v.dueLabelColor}`}>{renewalDueLabel(s.next_renewal_date!)}</p>
              </div>
              <button type="button" onClick={() => onActionClick(s)}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold text-white ${v.buttonBg} ${v.buttonHoverBg} transition-colors flex items-center gap-1.5 shrink-0`}>
                {actionLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RenewalsPanel;
