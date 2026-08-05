import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Users, LogOut, ClipboardList, User,
  Store, Settings, DollarSign, ShieldOff, Loader2, MessageCircle,
  PlayCircle, Bot, Sparkles, GraduationCap, Menu, X, ChevronRight, ShoppingBag, BookOpen, Briefcase, Video,
  TrendingUp, Plus, History, RefreshCcw, Mail, CreditCard,
} from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import { useCurrentUser, signOut, useStaffPermissions } from "@/hooks/useAuth";
import { getOverdueRenewals, getUpcomingRenewals } from "@/components/crm/RenewalsPanel";
import CrmOverview from "@/components/crm/CrmOverview";
import CrmCalendar from "@/components/crm/CrmCalendar";
import CrmForms from "@/components/crm/CrmForms";
import CrmContacts from "@/components/crm/CrmContacts";
import CrmBusiness from "@/components/crm/CrmBusiness";
import CrmMyAccount from "@/components/crm/CrmMyAccount";
import CrmSettings from "@/components/crm/CrmSettings";
import CrmVentas from "@/components/crm/CrmVentas";
import CrmSupport from "@/components/crm/CrmSupport";
import CrmSupportAdmin from "@/components/crm/CrmSupportAdmin";
import CrmVideos from "@/components/crm/CrmVideos";
import CrmAgentIA from "@/components/crm/CrmAgentIA";
import CrmComunicaciones from "@/components/crm/CrmComunicaciones";
import CrmStripe from "@/components/crm/CrmStripe";
import CrmServices from "@/components/crm/CrmServices";
import CrmProductos from "@/components/crm/CrmProductos";
import CrmProductosDigitales from "@/components/crm/CrmProductosDigitales";
import { useBusinessProfile, useMyClientAccount, useSupportUnreadCount, useAdminUnreadCount, useSales } from "@/hooks/useCrmData";

const SUPER_ADMIN_EMAIL = "e.daniel.acero.r@gmail.com";

export type View = "overview" | "mi_cuenta" | "business" | "servicios" | "productos_fisicos" | "productos_digitales" | "calendar" | "forms" | "contacts" | "ventas_reporte" | "ventas_registrar" | "ventas_historial" | "ventas_renovaciones" | "ventas_stripe" | "settings" | "soporte" | "tutoriales" | "agente_ia" | "comunicaciones";

type NavChild = { id: View; label: string; icon: React.ElementType };
type NavItem = { id: string; label: string; icon: React.ElementType; group: string; children?: NavChild[] };

// Vistas accesibles solo desde el menú de cuenta (foto + correo), no desde el sidebar principal.
const ACCOUNT_MENU_VIEW_META: Partial<Record<View, { label: string; icon: React.ElementType }>> = {
  mi_cuenta: { label: "Mi Cuenta",     icon: User     },
  business:  { label: "Mi Negocio",    icon: Store    },
  settings:  { label: "Ajustes", icon: Settings },
};

const PRODUCTOS_CHILDREN: NavChild[] = [
  { id: "servicios",           label: "Servicios",           icon: Briefcase   },
  { id: "productos_fisicos",   label: "Productos Físicos",   icon: ShoppingBag },
  { id: "productos_digitales", label: "Productos Digitales", icon: BookOpen    },
];

const VENTAS_CHILDREN: NavChild[] = [
  { id: "ventas_reporte",      label: "Reporte General",  icon: TrendingUp },
  { id: "ventas_historial",    label: "Historial",        icon: History    },
  { id: "ventas_registrar",    label: "Registrar Manual", icon: Plus       },
  { id: "ventas_renovaciones", label: "Renovaciones",     icon: RefreshCcw },
  { id: "ventas_stripe",       label: "Stripe",           icon: CreditCard },
];

const CRM_CHILDREN: NavChild[] = [
  { id: "contacts",        label: "Contactos",       icon: Users         },
  { id: "calendar",        label: "Calendarios",     icon: CalendarDays  },
  { id: "forms",           label: "Formularios",     icon: ClipboardList },
  { id: "comunicaciones",  label: "Comunicaciones",  icon: Mail          },
];

const IA_CHILDREN: NavChild[] = [
  { id: "agente_ia", label: "WhatsApp IA", icon: Bot },
];

const SOPORTE_CHILDREN: NavChild[] = [
  { id: "tutoriales", label: "Tutoriales", icon: Video         },
  { id: "soporte",    label: "Soporte",    icon: MessageCircle },
];

const navItems: NavItem[] = [
  { id: "overview",         label: "Inicio",        icon: LayoutDashboard, group: "Principal", },
  { id: "productos_menu",   label: "Productos",     icon: ShoppingBag,     group: "Principal", children: PRODUCTOS_CHILDREN },
  { id: "ventas_menu",      label: "Ventas",        icon: DollarSign,      group: "Principal", children: VENTAS_CHILDREN },
  { id: "crm_menu",         label: "CRM",           icon: Users,           group: "Principal", children: CRM_CHILDREN },
  { id: "ia_menu",          label: "IA",            icon: Sparkles,        group: "Principal", children: IA_CHILDREN },
  { id: "soporte_menu",     label: "Soporte",       icon: MessageCircle,   group: "Principal", children: SOPORTE_CHILDREN },
];

// Condiciones extra de visibilidad para items hijos, más allá del permiso base del staff.
const EXTRA_CHILD_VISIBILITY: Partial<Record<View, (ctx: { effectiveIsAdmin: boolean; isSaasClient: boolean }) => boolean>> = {
  tutoriales: ({ effectiveIsAdmin, isSaasClient }) => effectiveIsAdmin || isSaasClient,
  // En desarrollo — visible solo para el admin de Acrosoft, no para clientes SaaS ni staff.
  comunicaciones: ({ effectiveIsAdmin }) => effectiveIsAdmin,
  ventas_stripe: ({ effectiveIsAdmin }) => effectiveIsAdmin,
};

const flatNavItems: NavChild[] = navItems.flatMap(n => (n.children ?? [n]) as NavChild[]);

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

  const VALID_VIEWS: View[] = ["overview","mi_cuenta","business","servicios","productos_fisicos","productos_digitales","calendar","forms","contacts","ventas_reporte","ventas_registrar","ventas_historial","ventas_renovaciones","ventas_stripe","settings","soporte","tutoriales","agente_ia","comunicaciones"];
  const [view, setViewRaw]                         = useState<View>(() => {
    const saved = localStorage.getItem("crm_view") as View | null;
    return saved && VALID_VIEWS.includes(saved) ? saved : "overview";
  });
  const [pendingContactId, setPendingContactId]   = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen]             = useState(false);
  const [openMenus, setOpenMenus]                 = useState<Set<string>>(() => {
    const owner = navItems.find(n => n.children?.some(c => c.id === view));
    return owner ? new Set([owner.id]) : new Set();
  });
  const [accountMenuOpen, setAccountMenuOpen]     = useState(false);

  const toggleMenu = (id: string) => setOpenMenus(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  useEffect(() => {
    const owner = navItems.find(n => n.children?.some(c => c.id === view));
    if (owner) setOpenMenus(prev => prev.has(owner.id) ? prev : new Set(prev).add(owner.id));
  }, [view]);

  const setView = (v: View) => {
    localStorage.setItem("crm_view", v);
    setViewRaw(v);
  };

  const navigateTo = (v: View) => {
    setView(v);
    if (v !== "contacts") setPendingContactId(undefined);
  };

  const handleNavigateToContact = (contactId: string) => {
    setView("contacts");
    setPendingContactId(contactId);
  };

  const isSuperAdmin     = user?.email === SUPER_ADMIN_EMAIL;
  const effectiveIsAdmin = isSuperAdmin && !isStaff;
  const isSaasClient     = user?.user_metadata?.account_type === "saas_client";

  const { data: supportUnread = 0 } = useSupportUnreadCount();
  const { data: adminUnread   = 0 } = useAdminUnreadCount();
  const soporteBadge = effectiveIsAdmin ? adminUnread : supportUnread;

  const { data: salesForRenewals = [] } = useSales();
  const renewalsBadge = getOverdueRenewals(salesForRenewals).length + getUpcomingRenewals(salesForRenewals).length;

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
    setAccountMenuOpen(false);
  };

  const renderView = () => {
    switch (view) {
      case "overview":  return <CrmOverview onNavigate={navigateTo} />;
      case "mi_cuenta": return <CrmMyAccount />;
      case "business":  return (!isStaff || can("mi_negocio_datos","read")) ? <CrmBusiness /> : null;
      case "servicios": return (!isStaff || can("servicios","read")) ? (
        <CrmServices
          isSuperAdmin={effectiveIsAdmin}
          canEdit={!isStaff || can("servicios","edit")}
          canCreate={!isStaff || can("servicios","create")}
          canDelete={!isStaff || can("servicios","delete")}
        />
      ) : null;
      case "productos_fisicos": return (!isStaff || can("productos_fisicos","read")) ? (
        <CrmProductos
          kind="fisico"
          canEdit={!isStaff || can("productos_fisicos","edit")}
          canCreate={!isStaff || can("productos_fisicos","create")}
          canDelete={!isStaff || can("productos_fisicos","delete")}
        />
      ) : null;
      case "productos_digitales": return (!isStaff || can("productos_digitales","read")) ? (
        <CrmProductosDigitales isSuperAdmin={effectiveIsAdmin} isSaasClient={isSaasClient} />
      ) : null;
      case "calendar":  return can("calendarios","read")    ? <CrmCalendar onNavigateToContact={handleNavigateToContact} />  : null;
      case "forms":     return can("formularios","read")    ? <CrmForms />     : null;
      case "contacts":  return can("contactos","read")      ? <CrmContacts isSuperAdmin={effectiveIsAdmin} initialContactId={pendingContactId} /> : null;
      case "ventas_reporte":      return can("ventas_reporte","read")   ? <CrmVentas section="reporte" onNavigate={navigateTo} />      : null;
      case "ventas_historial":    return can("ventas_reporte","read")   ? <CrmVentas section="historial" onNavigate={navigateTo} />    : null;
      case "ventas_registrar":    return can("ventas_registrar","read") ? <CrmVentas section="registrar" onNavigate={navigateTo} />    : null;
      case "ventas_renovaciones": return can("ventas_registrar","read") ? <CrmVentas section="renovaciones" onNavigate={navigateTo} /> : null;
      case "ventas_stripe": return effectiveIsAdmin ? <CrmStripe /> : null;
      case "settings":  return !isStaff                     ? <CrmSettings isSuperAdmin={effectiveIsAdmin} isSaasClient={isSaasClient} /> : null;
      case "soporte":   return effectiveIsAdmin ? <CrmSupportAdmin /> : <CrmSupport />;
      case "tutoriales": return (effectiveIsAdmin || isSaasClient) ? <CrmVideos isAdmin={effectiveIsAdmin} /> : null;
      case "agente_ia":    return <CrmAgentIA
        isSuperAdmin={effectiveIsAdmin}
        isSaasClient={isSaasClient}
        isStaff={isStaff}
        ownerUserId={isStaff ? ownerUserId : null}
      />;
      case "comunicaciones": return effectiveIsAdmin ? <CrmComunicaciones /> : null;
    }
  };

  const SidebarContent = ({ showClose = false }: { showClose?: boolean }) => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="px-5 pb-4 shrink-0 flex items-center justify-between" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
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
          const items = navItems
            .filter(n => n.group === group)
            .map(n => {
              if (n.children) {
                const visibleChildren = n.children.filter(c =>
                  allowedNavItems.has(c.id) &&
                  (EXTRA_CHILD_VISIBILITY[c.id]?.({ effectiveIsAdmin, isSaasClient }) ?? true)
                );
                return visibleChildren.length ? { ...n, children: visibleChildren } : null;
              }
              if (!allowedNavItems.has(n.id)) return null;
              return n;
            })
            .filter((n): n is NavItem => n !== null);
          if (!items.length) return null;
          return (
            <div key={group}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-3 mb-1">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map(item => {
                  const Icon = item.icon;

                  if (item.children) {
                    const isOpen = openMenus.has(item.id);
                    const hasActiveChild = item.children.some(c => c.id === view);
                    const showCollapsedBadge = !isOpen && (
                      (item.children.some(c => c.id === "soporte") && soporteBadge > 0) ||
                      (item.children.some(c => c.id === "ventas_renovaciones") && renewalsBadge > 0)
                    );
                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => toggleMenu(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                            hasActiveChild ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <Icon size={15} className="shrink-0" />
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {showCollapsedBadge && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                          )}
                          <ChevronRight size={13} className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        </button>
                        {isOpen && (
                          <div className="mt-0.5 ml-4 pl-2 border-l border-border/60 space-y-0.5">
                            {item.children.map(child => {
                              const ChildIcon = child.icon;
                              const childActive = view === child.id;
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => handleNavClick(child.id)}
                                  style={childActive && brandPrimary ? { backgroundColor: `${brandPrimary}18`, color: brandPrimary } : {}}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                    childActive
                                      ? brandPrimary ? "" : "bg-primary/8 text-primary"
                                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                                  }`}
                                >
                                  <ChildIcon size={14} className="shrink-0" />
                                  <span className="flex-1 text-left truncate">{child.label}</span>
                                  {((child.id === "soporte" && soporteBadge > 0) || (child.id === "ventas_renovaciones" && renewalsBadge > 0)) && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id as View)}
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
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User section — botón que abre el menú de cuenta */}
      <div className="relative px-3 pb-4 pt-2 border-t shrink-0">
        {accountMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
            <div className="absolute left-3 right-3 bottom-full mb-2 z-50 bg-card border rounded-2xl shadow-lg overflow-hidden py-1">
              <button
                onClick={() => handleNavClick("mi_cuenta")}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                <User size={15} className="text-muted-foreground shrink-0" /> Mi cuenta
              </button>
              {(!isStaff || can("mi_negocio_datos", "read")) && (
                <button
                  onClick={() => handleNavClick("business")}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Store size={15} className="text-muted-foreground shrink-0" /> Mi Negocio
                </button>
              )}
              {!isStaff && (
                <button
                  onClick={() => handleNavClick("settings")}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Settings size={15} className="text-muted-foreground shrink-0" /> Ajustes
                </button>
              )}
              <div className="h-px bg-border my-1" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut size={15} className="shrink-0" /> Cerrar sesión
              </button>
            </div>
          </>
        )}
        <button
          onClick={() => setAccountMenuOpen(o => !o)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {userInitial}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-foreground truncate leading-tight">{displayEmail}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ver opciones</p>
          </div>
          <ChevronRight size={13} className={`text-muted-foreground shrink-0 transition-transform ${accountMenuOpen ? "-rotate-90" : ""}`} />
        </button>
      </div>
    </div>
  );

  const currentLabel = flatNavItems.find(n => n.id === view)?.label ?? ACCOUNT_MENU_VIEW_META[view]?.label ?? "";
  const CurrentIcon  = flatNavItems.find(n => n.id === view)?.icon ?? ACCOUNT_MENU_VIEW_META[view]?.icon ?? LayoutDashboard;

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-52 xl:w-56 flex-col border-r bg-card shrink-0">
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
        <div className="lg:hidden flex items-center gap-3 px-4 pb-3 border-b bg-card shrink-0" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
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
        </div>

        {/* Content */}
        {view === "agente_ia" ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderView()}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-8 max-w-6xl w-full mx-auto">
            {renderView()}
          </div>
        )}
      </main>
    </div>
  );
};

export default Crm;
