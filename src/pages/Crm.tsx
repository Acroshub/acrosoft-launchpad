import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Users, Kanban, LogOut, ClipboardList, Store } from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import { useCurrentUser, signOut } from "@/hooks/useAuth";
import CrmOverview from "@/components/crm/CrmOverview";
import CrmCalendar from "@/components/crm/CrmCalendar";
import CrmForms from "@/components/crm/CrmForms";
import CrmContacts from "@/components/crm/CrmContacts";
import CrmPipeline from "@/components/crm/CrmPipeline";
import CrmBusiness from "@/components/crm/CrmBusiness";

// {VAR_DB} — isSuperAdmin vendrá del perfil del usuario en Supabase
const isSuperAdmin = true;

type View = "overview" | "business" | "calendar" | "forms" | "contacts" | "pipeline";

const navItems: { id: View; label: string; icon: React.ElementType; group: string }[] = [
  { id: "overview",  label: "Resumen",      icon: LayoutDashboard, group: "Principal"  },
  { id: "business",  label: "Mi Negocio",   icon: Store,           group: "Principal"  },
  { id: "calendar",  label: "Calendarios",  icon: CalendarDays,    group: "Calendario" },
  { id: "forms",     label: "Formularios",  icon: ClipboardList,   group: "Calendario" },
  { id: "contacts",  label: "Contactos",    icon: Users,           group: "CRM"        },
  { id: "pipeline",  label: "Pipeline",     icon: Kanban,          group: "CRM"        },
];

const groups = [...new Set(navItems.map((n) => n.group))];

const Crm = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [view, setView]             = useState<View>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderView = () => {
    switch (view) {
      case "overview":  return <CrmOverview isSuperAdmin={isSuperAdmin} />;
      case "business":  return <CrmBusiness />;
      case "calendar":  return <CrmCalendar />;
      case "forms":     return <CrmForms />;
      case "contacts":  return <CrmContacts isSuperAdmin={isSuperAdmin} />;
      case "pipeline":  return <CrmPipeline />;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b">
        <AcrosoftLogo size="sm" />
        {/* {VAR_DB} — nombre del negocio desde el perfil */}
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
                .filter((n) => n.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setView(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon size={15} />
                      {item.label}
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
