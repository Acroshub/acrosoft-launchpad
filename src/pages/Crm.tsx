import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Users, Kanban, LogOut, ClipboardList,
  Store, Settings, Bell, DollarSign, ShieldOff, Loader2, MessageCircle,
  PlayCircle, Link, Bot, GraduationCap, Menu, X, ChevronRight, BookOpen, Video,
} from "lucide-react";
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
import CrmVideos from "@/components/crm/CrmVideos";
import CrmVendorLinks from "@/components/crm/CrmVendorLinks";
import CrmVendors from "@/components/crm/CrmVendors";
import CrmAgentIA from "@/components/crm/CrmAgentIA";
import CrmCourses from "@/components/crm/CrmCourses";
import { useBusinessProfile, useMyClientAccount, useSupportUnreadCount, useAdminUnreadCount, useVendorProfile } from "@/hooks/useCrmData";
import { vendorVisibleNavItems } from "@/lib/permissions";

const SUPER_ADMIN_EMAIL = "e.daniel.acero.r@gmail.com";

type View = "overview" | "business" | "calendar" | "forms" | "contacts" | "pipeline" | "ventas" | "reminders" | "settings" | "soporte" | "tutoriales" | "vendor_links" | "vendors" | "agente_ia" | "cursos";

const navItems: { id: View; label: string; icon: React.ElementType; group: string }[] = [
  { id: "overview",     label: "Resumen",             icon: LayoutDashboard, group: "Principal"  },
  { id: "business",     label: "Mi Negocio",          icon: Store,           group: "Principal"  },
  { id: "ventas",       label: "Ventas",              icon: DollarSign,      group: "Principal"  },
  { id: "contacts",     label: "Contactos",           icon: Users,           group: "CRM"        },
  { id: "forms",        label: "Formularios",         icon: ClipboardList,   group: "CRM"        },
  { id: "calendar",     label: "Calendarios",         icon: CalendarDays,    group: "CRM"        },
  { id: "pipeline",     label: "Pipeline",            icon: Kanban,          group: "CRM"        },
  { id: "reminders",    label: "Notificaciones",      icon: Bell,            group: "CRM"        },
  { id: "agente_ia",    label: "Agente IA",           icon: Bot,             group: "CRM"        },
  { id: "vendor_links", label: "Links",               icon: Link,            group: "CRM"        },
  { id: "cursos",        label: "Cursos",              icon: BookOpen,        group: "CRM"        },
  { id: "tutoriales",   label: "Tutoriales",          icon: Video,           group: "Ajustes"    },
  { id: "soporte",      label: "Soporte",             icon: MessageCircle,   group: "Ajustes"    },
  { id: "settings",     label: "Configuración",       icon: Settings,        group: "Ajustes"    },
];

const groups = [...new Set(navItems.map(n => n.group))];

// Genera color de avatar determinístico a partir del email
function getAvatarColor(str: string) {
  const colors = ["#1877F2", "#0a57d0", "#00a884", "#9B59B6", "#E67E22", "#E91E63", "#3498DB", "#2ECC71"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const Crm = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { isStaff, navItems: allowedNavItems, can, ownerUserId } = useStaffPermissions();
  const { data: businessProfile } = useBusinessProfile();
  const { data: myClientAccount, isLoading: accountLoading } = useMyClientAccount();
  const isBranded    = businessProfile?.theme === "branded";
  const brandLogo    = isBranded ? (businessProfile?.logo_url ?? null) : null;
  const brandPrimary = isBranded ? (businessProfile?.color_primary ?? null) : null;

  const [view, setView]                           = useState<View>("overview");
  const [pendingBusinessTab, setPendingBusinessTab] = useState<string | undefined>(undefined);
  const [pendingContactId, setPendingContactId]   = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen]             = useState(false);

  const navigateTo = (v: View, tab?: string) => {
    setView(v);
    if (v === "business" && tab) setPendingBusinessTab(tab);
    else setPendingBusinessTab(undefined);
    if (v !== "contacts") setPendingContactId(undefined);
  };

  const handleNavigateToContact = (contactId: string) => {
    setView("contacts");
    setPendingContactId(contactId);
    setPendingBusinessTab(undefined);
  };

  const { data: vendorProfile, isLoading: vendorLoading } = useVendorProfile();
  const isVendor = !!vendorProfile && !isStaff;

  const isSuperAdmin     = user?.email === SUPER_ADMIN_EMAIL;
  const effectiveIsAdmin = isSuperAdmin && !isStaff && !isVendor;
  const isSaasClient     = user?.user_metadata?.account_type === "saas_client";

  const { data: supportUnread = 0 } = useSupportUnreadCount();
  const { data: adminUnread   = 0 } = useAdminUnreadCount();
  const soporteBadge = effectiveIsAdmin ? adminUnread : supportUnread;

  const effectiveAllowedNavItems = isVendor ? vendorVisibleNavItems() : allowedNavItems;

  const userEmail     = user?.email ?? "";
  const userInitial   = userEmail[0]?.toUpperCase() ?? "U";
  const avatarColor   = getAvatarColor(userEmail);
  const displayEmail  = userEmail.length > 26 ? userEmail.slice(0, 24) + "…" : userEmail;

  if (isSaasClient && accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

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

  const handleNavClick = (id: View) => {
    setView(id);
    setSidebarOpen(false);
  };

  const renderView = () => {
    switch (view) {
      case "overview":  return <CrmOverview isSuperAdmin={effectiveIsAdmin} isVendor={isVendor} onNavigate={navigateTo} />;
      case "business":  return (!isStaff || can("mi_negocio_personal","read") || can("mi_negocio_datos","read") || can("servicios","read")) ? <CrmBusiness initialTab={pendingBusinessTab as any} /> : null;
      case "calendar":  return can("calendarios","read")    ? <CrmCalendar onNavigateToContact={handleNavigateToContact} />  : null;
      case "forms":     return can("formularios","read")    ? <CrmForms />     : null;
      case "contacts":  return can("contactos","read")      ? <CrmContacts isSuperAdmin={effectiveIsAdmin} isVendor={isVendor} initialContactId={pendingContactId} /> : null;
      case "pipeline":  return can("pipeline","read")       ? <CrmPipeline />  : null;
      case "ventas":    return can("ventas","read")         ? <CrmVentas isSuperAdmin={effectiveIsAdmin} isVendor={isVendor} vendorProfile={vendorProfile ?? null} /> : null;
      case "reminders": return can("recordatorios","read")  ? <CrmReminders /> : null;
      case "settings":  return (!isStaff || isVendor)       ? <CrmSettings isSuperAdmin={effectiveIsAdmin} isSaasClient={isSaasClient} isVendor={isVendor} vendorId={vendorProfile?.id ?? null} /> : null;
      case "soporte":   return effectiveIsAdmin ? <CrmSupportAdmin /> : <CrmSupport />;
      case "tutoriales": return (effectiveIsAdmin || isSaasClient) ? <CrmVideos isAdmin={effectiveIsAdmin} /> : null;
      case "cursos":       return <CrmCourses />;
      case "vendor_links": return isVendor ? <CrmVendorLinks vendorProfile={vendorProfile!} /> : null;
      case "vendors":      return effectiveIsAdmin ? <CrmVendors /> : null;
      case "agente_ia":    return <CrmAgentIA
        isSuperAdmin={effectiveIsAdmin}
        isSaasClient={isSaasClient}
        isStaff={isStaff}
        isVendor={isVendor}
        ownerUserId={isStaff ? ownerUserId : null}
      />;
    }
  };

  const SidebarContent = ({ showClose = false }: { showClose?: boolean }) => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="px-5 pt-5 pb-4 shrink-0 flex items-center justify-between">
        {brandLogo ? (
          <img src={brandLogo} alt="Logo" className="h-8 max-w-[140px] object-contain" />
        ) : (
          <AcrosoftLogo size="sm" />
        )}
        {showClose && (
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-2 overflow-y-auto space-y-4">
        {groups.map(group => {
          const items = navItems.filter(n =>
            n.group === group &&
            effectiveAllowedNavItems.has(n.id) &&
            (n.id !== "tutoriales"   || effectiveIsAdmin || isSaasClient) &&
            (n.id !== "cursos"       || isSaasClient    || effectiveIsAdmin) &&
            (n.id !== "vendor_links" || isVendor)
          );
          if (!items.length) return null;
          return (
            <div key={group}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-3 mb-1">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map(item => {
                  const Icon  = item.icon;
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      style={active && brandPrimary ? { backgroundColor: `${brandPrimary}18`, color: brandPrimary, borderLeftColor: brandPrimary } : {}}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                        active
                          ? brandPrimary
                            ? "border-l-2"
                            : "bg-primary/8 text-primary border-l-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <Icon size={15} className={`shrink-0 transition-transform ${active ? "" : "group-hover:scale-110"}`} />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.id === "soporte" && soporteBadge > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 pt-2 border-t shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl group">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate leading-tight">{displayEmail}</p>
            <button
              onClick={handleSignOut}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 mt-0.5"
            >
              <LogOut size={10} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const currentLabel = navItems.find(n => n.id === view)?.label ?? "";
  const CurrentIcon  = navItems.find(n => n.id === view)?.icon ?? LayoutDashboard;

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-56 xl:w-60 flex-col border-r bg-card shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-64 h-full bg-card border-r flex flex-col shadow-2xl animate-slide-right">
            <SidebarContent showClose />
          </aside>
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl hover:bg-secondary transition-colors flex items-center justify-center text-muted-foreground"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CurrentIcon size={15} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold truncate">{currentLabel}</span>
          </div>
          {/* Avatar mobile */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {userInitial}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-8 max-w-6xl w-full mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default Crm;
