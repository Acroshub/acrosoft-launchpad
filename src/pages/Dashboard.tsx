import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, FolderOpen, CheckCircle, DollarSign, Search, Eye, Download,
  ArrowLeft, LogOut, FileText, MessageSquare, Info, Star, Zap,
  TrendingUp, Calendar, Globe, Phone, LayoutDashboard, Sparkles
} from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import Var from "@/components/Var";

// ─── DATOS DESDE DB ──────────────────────────────────────────────────────────
// Todos los campos marcados con {VAR_DB} deben reemplazarse con datos reales
// provenientes de Supabase cuando se conecte la base de datos.

const clients = [
  {
    id: "{VAR_DB}",
    name: "{VAR_DB}",
    plan: "{VAR_DB}",
    status: "{VAR_DB}",
    date: "{VAR_DB}",
    domain: "{VAR_DB}",
    revenue: "{VAR_DB}",
  },
];

const statusStyles: Record<string, string> = {
  "Recibido":    "bg-muted text-muted-foreground border-border",
  "En progreso": "bg-primary/8 text-primary border-primary/20",
  "Entregado":   "bg-muted text-foreground border-border",
};

const metrics = [
  { icon: Users,       label: "Total clientes",   value: "{VAR_DB}", trend: "{VAR_DB}" },
  { icon: FolderOpen,  label: "Proyectos activos", value: "{VAR_DB}", trend: "{VAR_DB}" },
  { icon: CheckCircle, label: "Entregados (mes)",  value: "{VAR_DB}", trend: "{VAR_DB}" },
  { icon: DollarSign,  label: "MRR",               value: "{VAR_DB}", trend: "{VAR_DB}" },
];

/* ─── CLIENT DETAIL ─────────────────────────────────────────────────────────── */
const ClientDetail = ({ clientId, onBack }: { clientId: string; onBack: () => void }) => {
  const [tab, setTab] = useState<"info" | "ai" | "notes">("info");
  const client = clients.find(c => c.id === clientId);

  // {VAR_DB} — contenido del brief generado por IA, recuperado desde Supabase
  const mdContent = "{VAR_DB}";

  return (
    <div className="min-h-screen bg-secondary/20 pb-20 overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg hover:bg-secondary">
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                {/* {VAR_DB} — nombre y estado del cliente */}
                <h1 className="text-base font-semibold">{client?.name || "{VAR_DB}"}</h1>
                <Badge variant="outline" className={statusStyles[client?.status || "Recibido"]}>
                  {client?.status || "{VAR_DB}"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                {/* {VAR_DB} — fecha recibido y dominio */}
                <Calendar size={11} /> Recibido el {client?.date || "{VAR_DB}"}
                <span className="text-border">·</span>
                <Globe size={11} /> {client?.domain || "{VAR_DB}"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="hidden sm:flex rounded-lg text-xs">
              <Download size={14} className="mr-1.5" /> Exportar .md
            </Button>
            <Button size="sm" className="rounded-lg text-xs">
              <Zap size={14} className="mr-1.5" /> Guardar Cambios
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Tabs */}
          <div className="flex p-1 bg-background border rounded-xl w-full sm:w-fit">
            {([["info", "Ficha Técnica", Info], ["ai", "Propuesta IA", Sparkles], ["notes", "Notas & Log", MessageSquare]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === key ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Tab: Ficha Técnica */}
          {tab === "info" && (
            <div className="grid md:grid-cols-3 gap-4 animate-in fade-in duration-300">
              {[
                {
                  title: "Información del Negocio",
                  icon: FolderOpen,
                  fields: [
                    ["Rubro",  "{VAR_DB}"],
                    ["Ciudad", "{VAR_DB}"],
                    ["Años",   "{VAR_DB}"],
                    ["Plan",   client?.plan || "{VAR_DB}"],
                  ],
                },
                {
                  title: "Datos de Contacto",
                  icon: Phone,
                  fields: [
                    ["WhatsApp",  "{VAR_DB}"],
                    ["Email",     "{VAR_DB}"],
                    ["Instagram", "{VAR_DB}"],
                    ["Facebook",  "{VAR_DB}"],
                  ],
                },
                {
                  title: "Identidad & Marca",
                  icon: Star,
                  fields: [
                    ["Estilo",           "{VAR_DB}"],
                    ["Color Primario",   "{VAR_DB}"],
                    ["Color Secundario", "{VAR_DB}"],
                    ["Tipografía",       "{VAR_DB}"],
                  ],
                },
              ].map((section) => (
                <div key={section.title} className="bg-background border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <section.icon size={14} className="text-muted-foreground" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</h3>
                  </div>
                  <div className="space-y-3">
                    {section.fields.map(([label, value]) => (
                      <div key={label} className="flex flex-col">
                        <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5">{label}</span>
                        <span className="text-sm font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="md:col-span-3 bg-background border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={14} className="text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción del Negocio</h3>
                </div>
                {/* {VAR_DB} — descripción larga ingresada en el onboarding */}
                <p className="text-sm leading-relaxed text-muted-foreground bg-secondary/30 p-5 rounded-xl border border-dashed border-border/60 italic">
                  {"{VAR_DB}"}
                </p>
              </div>
            </div>
          )}

          {/* Tab: Propuesta IA */}
          {tab === "ai" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-background border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles size={18} className="text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">Propuesta de Contenido IA</h2>
                      <p className="text-xs text-muted-foreground">Generado con Claude Sonnet</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs">
                    <Zap size={13} className="mr-1.5" /> Regenerar
                  </Button>
                </div>

                <div className="bg-secondary/20 rounded-xl border overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    <FileText size={11} /> master_document_v3.md
                  </div>
                  {/* {VAR_DB} — contenido del brief generado por IA desde Supabase Edge Function */}
                  <pre className="font-mono text-[12px] whitespace-pre-wrap p-6 text-foreground leading-relaxed overflow-x-auto">
                    {mdContent}
                  </pre>
                </div>
              </div>

              <div className="bg-secondary/30 border rounded-xl p-5 flex gap-3">
                <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {/* {VAR_DB} — observaciones generadas por IA según el brief */}
                  <p className="text-sm font-medium">Revisión pendiente</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{"{VAR_DB}"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Notas & Log */}
          {tab === "notes" && (
            <div className="grid md:grid-cols-3 gap-4 animate-in fade-in duration-300">
              <div className="md:col-span-2">
                <div className="bg-background border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare size={14} className="text-muted-foreground" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notas del Administrador</h3>
                  </div>
                  {/* {VAR_DB} — notas guardadas en Supabase */}
                  <Textarea
                    placeholder="Escribe notas privadas o instrucciones para el equipo..."
                    className="min-h-[180px] rounded-xl bg-secondary/20 border-border/50 resize-none p-4 text-sm"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" className="rounded-lg text-xs">Guardar Nota</Button>
                  </div>
                </div>
              </div>

              <div className="bg-background border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp size={14} className="text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historial</h3>
                </div>
                <div className="space-y-5 relative ml-2">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                  {/* {VAR_DB} — eventos del historial desde Supabase */}
                  <div className="relative flex gap-3 pl-6">
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{"{VAR_DB}"}</p>
                      <p className="text-xs font-medium mt-0.5">{"{VAR_DB}"}</p>
                      <p className="text-[10px] text-muted-foreground">Autor: {"{VAR_DB}"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

/* ─── DASHBOARD PRINCIPAL ────────────────────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [viewingClient, setViewingClient] = useState<string | null>(null);

  if (viewingClient) {
    return <ClientDetail clientId={viewingClient} onBack={() => setViewingClient(null)} />;
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-secondary/10 overflow-x-hidden">
      <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link to="/"><AcrosoftLogo size="sm" /></Link>
            <div className="h-4 w-px bg-border hidden md:block" />
            <div className="hidden md:flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground tracking-widest uppercase">
              <LayoutDashboard size={13} /> Panel de Control
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              {/* {VAR_DB} — nombre y rol del admin autenticado */}
              <span className="text-xs font-medium text-foreground"><Var name="Admin_Name" /></span>
              <span className="text-[10px] text-muted-foreground"><Var name="Admin_Role" /></span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold border border-primary/20">
              <Var name="Admin_Initial" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} title="Cerrar Sesión" className="rounded-lg hover:bg-destructive/10 hover:text-destructive">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Welcome */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {/* {VAR_DB} — nombre del admin autenticado */}
              <h1 className="text-2xl font-semibold tracking-tight">Bienvenido, <Var name="Admin_Name" /></h1>
              <p className="text-sm text-muted-foreground mt-0.5">Panel de proyectos y clientes de Acrosoft Labs.</p>
            </div>
            <Button onClick={() => navigate("/onboarding")} className="rounded-xl h-10 px-5 text-sm font-medium">
              <Var name="Btn_New_Client" />
            </Button>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-background border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <m.icon size={16} className="text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                {/* {VAR_DB} — valor calculado desde Supabase */}
                <p className="text-2xl font-semibold text-foreground">—</p>
              </div>
            ))}
          </div>

          {/* Tabla de proyectos */}
          <div className="bg-background border rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Proyectos</h2>
                {/* {VAR_DB} — conteo de clientes desde Supabase */}
                <p className="text-xs text-muted-foreground mt-0.5">{"{VAR_DB}"} clientes activos</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9 bg-secondary/30 border-transparent focus:bg-background focus:border-border rounded-xl text-sm transition-all"
                    placeholder="Buscar cliente o dominio..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-6 py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Cliente</th>
                    <th className="px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Plan</th>
                    <th className="px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Estado</th>
                    <th className="px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Ingreso</th>
                    <th className="px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Fecha</th>
                    <th className="px-6 py-3 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {/* {VAR_DB} — filas de clientes desde Supabase */}
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setViewingClient(c.id)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Globe size={10} /> {c.domain}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-muted-foreground">{c.plan}</span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={`text-[10px] font-medium rounded-full ${statusStyles[c.status] || ""}`}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-foreground">{c.revenue}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-muted-foreground">{c.date}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                            onClick={(e) => { e.stopPropagation(); setViewingClient(c.id); }}
                          >
                            <Eye size={15} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-between">
              {/* {VAR_DB} — paginación desde Supabase */}
              <p className="text-xs text-muted-foreground">{"{VAR_DB}"} resultados</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled className="rounded-lg text-xs">Anterior</Button>
                <Button variant="outline" size="sm" disabled className="rounded-lg text-xs">Siguiente</Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <p className="text-center text-[10px] text-muted-foreground/30 mt-8 mb-10 uppercase tracking-widest">
        Acrosoft Labs · Admin v3
      </p>
    </div>
  );
};

export default Dashboard;
