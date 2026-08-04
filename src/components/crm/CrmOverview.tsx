import { CalendarDays, Check, Settings2, RefreshCcw, ChevronRight } from "lucide-react";
import OnboardingWizard from "@/components/crm/OnboardingWizard";
import SalesTrendCard from "@/components/crm/SalesTrendCard";
import { getOverdueRenewals, getUpcomingRenewals } from "@/components/crm/RenewalsPanel";
import { useState, useMemo, useEffect, useRef } from "react";
import { useContacts, useAppointments, useSales, useBusinessProfile, useUpsertBusinessProfile } from "@/hooks/useCrmData";
import type { View } from "@/pages/Crm";

const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  const renewalsCount = useMemo(
    () => getOverdueRenewals(salesData).length + getUpcomingRenewals(salesData).length,
    [salesData]
  );

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

      {/* ── Banner de renovaciones ── */}
      {renewalsCount > 0 && (
        <button
          onClick={() => onNavigate?.("ventas_renovaciones")}
          className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <RefreshCcw size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              Tienes {renewalsCount} renovación{renewalsCount !== 1 ? "es" : ""} para atender
            </p>
            <p className="text-xs text-amber-600">Pagos recurrentes próximos o vencidos</p>
          </div>
          <ChevronRight size={16} className="text-amber-600 shrink-0" />
        </button>
      )}

      {/* ── Onboarding ── */}
      {onNavigate && (
        <OnboardingWizard onNavigate={onNavigate} />
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">

      {/* ── Grupo Ventas ── */}
      <SalesTrendCard sales={salesData} className={`${mobileOrder === "citas" ? "order-2" : "order-1"} lg:order-1`} />

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
