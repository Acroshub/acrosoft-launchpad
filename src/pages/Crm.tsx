import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Users, Kanban, LogOut, ClipboardList, Store, Settings, Bell, DollarSign, ShieldOff, Loader2, MessageCircle } from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import { useCurrentUser, signOut, useStaffPermissions } from "@/hooks/useAuth";
import CrmOverview from "@/components/crm/CrmOverview";
import CrmCalendar from "@/components/crm/CrmCalendar";
import CrmForms from "@/components/crm/CrmForms";
import CrmContacts from "@/components/crm/CrmContacts";
import CrmPipeline from "@/components/crm/CrmPipeline";
import CrmBusiness from "@/components/crm/CrmBusiness";
import CrmSettings from "@/components/crm/CrmSettings";
import CrmReminders from "@/components/crm/CrmReminders";
import CrmVentas from "@/components/crm/CrmVentas";
import CrmSupport from "@/components/crm/CrmSupport";
import CrmSupportAdmin from "@/components/crm/CrmSupportAdmin";
import { useBusinessProfile, useMyClientAccount, useSupportUnreadCount, useAdminUnreadCount } from "@/hooks/useCrmData";

const SUPER_ADMIN_EMAIL = "e.daniel.acero.r@gmail.com";

type View = "overview" | "business" | "calendar" | "forms" | "contacts" | "pipeline" | "ventas" | "reminders" | "settings" | "soporte";

const navItems: { id: View; label: string; icon: React.ElementType; group: string }[] = [
  { id: "overview",   label: "Resumen",        icon: LayoutDashboard, group: "Principal"      },
  { id: "business",   label: "Mi Negocio",     icon: Store,           group: "Principal"      },
  { id: "calendar",   label: "Calendarios",    icon: CalendarDays,    group: "Calendario"     },
  { id: "forms",      label: "Formularios",    icon: ClipboardList,   group: "Calendario"     },
  { id: "contacts",   label: "Contactos",      icon: Users,           group: "CRM"            },
  { id: "pipeline",   label: "Pipeline",       icon: Kanban,          group: "CRM"            },
  { id: "ventas",     label: "Ventas",         icon: DollarSign,      group: "CRM"            },
  { id: "reminders",  label: "Recordatorios",  icon: Bell,            group: "CRM"            },
  { id: "settings",   label: "Configuración",  icon: Settings,        group: "Configuración"  },
  { id: "soporte",    label: "Soporte",        icon: MessageCircle,   group: "Configuración"  },
];

const groups = [...new Set(navItems.map((n) => n.group))];

const Crm = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { isStaff, navItems: allowedNavItems, can } = useStaffPermissions();
  const { data: businessProfile } = useBusinessProfile();
  const { data: myClientAccount, isLoading: accountLoading } = useMyClientAccount();
  const isBranded = businessProfile?.theme === "branded";
  const brandLogo = isBranded ? (businessProfile?.logo_url ?? null) : null;
  const brandPrimary = isBranded ? (businessProfile?.color_primary ?? null) : null;
  const [view, setView]             = useState<View>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  const effectiveIsAdmin = isSuperAdmin && !isStaff;

  const isSaasClient = user?.user_metadata?.account_type === "saas_client";
  const { data: supportUnread = 0 } = useSupportUnreadCount();
  const { data: adminUnread = 0 } = useAdminUnreadCount();
  const soporteBadge = effectiveIsAdmin ? adminUnread : supportUnread;

  // While loading account status, show spinner to avoid CRM flash for disabled clients
  if (isSaasClient && accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Block disabled SaaS clients before rendering the full CRM
  if (isSaasClient && myClientAccount?.status === "disabled") {
    return (
      <div className="min-h-screen bg-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldOff size={28} className="text-destructive" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Cuenta deshabilitada</h1>
            <p className="text-sm text-muted-foreground">
              Tu acceso al CRM ha sido suspendido. Contacta a Acrosoft Labs para más información.
            </p>
          </div>
          <button
            onClick={() => signOut().then(() => navigate("/login"))}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderView = () => {
    switch (view) {
      case "overview":  return <CrmOverview isSuperAdmin={effectiveIsAdmin} />;
      case "business":  return (!isStaff || can("mi_negocio_personal", "read") || can("mi_negocio_datos", "read") || can("servicios", "read")) ? <CrmBusiness /> : null;
      case "calendar":  return can("calendarios", "read")  ? <CrmCalendar />  : null;
      case "forms":     return can("formularios", "read")  ? <CrmForms />     : null;
      case "contacts":  return can("contactos", "read")    ? <CrmContacts isSuperAdmin={effectiveIsAdmin} /> : null;
      case "pipeline":   return can("pipeline", "read")     ? <CrmPipeline />   : null;
      case "ventas":     return can("ventas", "read")         ? <CrmVentas isSuperAdmin={effectiveIsAdmin} /> : null;
      case "reminders":  return can("recordatorios", "read") ? <CrmReminders /> : null;
      case "settings":   return !isStaff                   ? <CrmSettings isSuperAdmin={effectiveIsAdmin} />   : null;
      case "soporte":    return effectiveIsAdmin ? <CrmSupportAdmin /> : <CrmSupport />;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b">
        {brandLogo ? (
          <img src={brandLogo} alt="Logo" className="h-8 max-w-[140px] object-contain" />
        ) : (
          <AcrosoftLogo size="sm" />
        )}
        <p className="text-[11px] text-muted-foreground mt-2 font-medium truncate">{user?.email}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group}>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold px-2 mb-1.5">
              {group}
            </p>
            <div className="space-y-0.5">
              {navItems
                .filter((n) => n.group === group && allowedNavItems.has(n.id))
                .map((item) => {
                  const Icon = item.icon;
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setView(item.id); setSidebarOpen(false); }}
                      style={active && brandPrimary ? { backgroundColor: brandPrimary, color: "#fff" } : {}}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? brandPrimary ? "" : "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon size={15} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.id === "soporte" && soporteBadge > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all w-full"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden lg:flex w-56 flex-col border-r bg-card shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-56 h-full bg-card border-r flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="space-y-1">
              <div className="w-4 h-0.5 bg-foreground rounded" />
              <div className="w-4 h-0.5 bg-foreground rounded" />
              <div className="w-4 h-0.5 bg-foreground rounded" />
            </div>
          </button>
          <span className="text-sm font-semibold">
            {navItems.find((n) => n.id === view)?.label}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-6xl w-full mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default Crm;
