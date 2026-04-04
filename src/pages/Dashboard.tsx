import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, FolderOpen, CheckCircle, DollarSign, Search, Eye, Download,
  ArrowLeft, LogOut, FileText, MessageSquare, Info, Star, Zap,
  TrendingUp, Calendar, Globe, Mail, Phone, Instagram, Facebook, LayoutDashboard
} from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import Var from "@/components/Var";

const clients = [
  { id: "1", name: "El Sabor de México", plan: "Multi Page", status: "Recibido", date: "04 Abr 2024", domain: "sabordemexico.com", revenue: "$1,500" },
  { id: "2", name: "Bella Nails & Spa", plan: "Single Page", status: "En progreso", date: "02 Abr 2024", domain: "bellanails.miami", revenue: "$500" },
  { id: "3", name: "Constructo Pro", plan: "Multi Page", status: "Entregado", date: "28 Mar 2024", domain: "constructopro.fl", revenue: "$1,500" },
  { id: "4", name: "Dr. Smile Dental", plan: "Custom Booking", status: "En progreso", date: "25 Mar 2024", domain: "drsmiledental.com", revenue: "$5,000" },
  { id: "5", name: "A&M Law Firm", plan: "Multi Page", status: "Recibido", date: "20 Mar 2024", domain: "amlawfirm.us", revenue: "$1,500" },
  { id: "6", name: "Tacos El Guero", plan: "Single Page", status: "Entregado", date: "15 Mar 2024", domain: "tacosguero.com", revenue: "$500" },
];

const statusStyles: Record<string, string> = {
  "Recibido": "bg-amber-100 text-amber-700 border-amber-200 shadow-sm shadow-amber-50",
  "En progreso": "bg-blue-100 text-blue-700 border-blue-200 shadow-sm shadow-blue-50",
  "Entregado": "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-50",
};

const metrics = [
  { icon: Users, label: "Total clientes", value: "24", trend: "+12%", color: "text-blue-600", bg: "bg-blue-50" },
  { icon: FolderOpen, label: "Proyectos activos", value: "8", trend: "En curso", color: "text-primary", bg: "bg-primary/5" },
  { icon: CheckCircle, label: "Entregados (mes)", value: "12", trend: "+4", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: DollarSign, label: "MRR", value: "$4,250", trend: "+18%", color: "text-amber-600", bg: "bg-amber-50" },
];

/* CLIENT DETAIL COMPONENT */
const ClientDetail = ({ clientId, onBack }: { clientId: string; onBack: () => void }) => {
  const [tab, setTab] = useState<"info" | "ai" | "notes">("info");
  const client = clients.find(c => c.id === clientId);

  const mdContent = [
     "# " + (client?.name || "Cliente") + " — Brief de Proyecto",
    "Plan: " + (client?.plan || "Multi Page") + " · " + (client?.revenue || "$1,500") + " setup",
    "Fecha: " + (client?.date || "2024-04-04"),
    "",
    "## BRIEF DE DISEÑO",
    "Rubro: Restaurante / Comida Mexicana",
    "Ubicación: Miami, FL",
    "Colores: #D91B1B (Rojo) · #F59E0B (Dorado)",
    "Estilo: Moderno y Tradicional",
    "Dominio: " + (client?.domain || "pendiente.com"),
    "",
    "## 🪄 CONTENIDO GENERADO POR IA (BILINGÜE)",
    "### HERO SECTION",
    "Headline ES: El auténtico sabor de México en el corazón de Miami.",
    "Headline EN: Authentic Mexican flavor in the heart of Miami.",
    "Subheadline ES: Recetas ancestrales, ingredientes frescos y el ambiente más cálido para tu familia.",
    "Subheadline EN: Ancestral recipes, fresh ingredients, and the warmest atmosphere for your family.",
    "",
    "### SEO ESTRATÉGICO",
    "Keyword Principal: Restaurante Mexicano en Miami",
    "Meta Title ES: El Sabor de México | Mejor Comida Mexicana en Miami, FL",
    "Meta Description ES: Disfruta de los mejores tacos, enchiladas y margaritas en Miami. Reserva tu mesa online hoy mismo.",
  ].join("\n");

  return (
    <div className="min-h-screen bg-secondary/20 pb-20 overflow-x-hidden">
      {/* Detail Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="rounded-xl hover:bg-secondary">
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">{client?.name || "Detalle del Cliente"}</h1>
                <Badge variant="outline" className={statusStyles[client?.status || "Recibido"]}>{client?.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                <Calendar size={12} /> Recibido el {client?.date} <span className="text-border">|</span> <Globe size={12} /> {client?.domain}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="hidden sm:flex rounded-xl font-bold border-2">
              <Download size={16} className="mr-2" /> Exportar .md
            </Button>
            <Button size="sm" className="rounded-xl font-black shadow-lg shadow-primary/20">
              <Zap size={16} className="mr-2 fill-current" /> Guardar Cambios
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Tabs Navigation */}
          <div className="flex p-1 bg-background/50 border rounded-2xl w-full sm:w-fit backdrop-blur-sm">
            {([["info", "Ficha Técnica", Info], ["ai", "Propuesta IA", Sparkles], ["notes", "Notas & Log", MessageSquare]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tab === key ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          {/* Tab Content: Info */}
          {tab === "info" && (
            <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {[
                { title: "Información del Negocio", icon: FolderOpen, fields: [["Rubro", "Restaurante"], ["Ciudad", "Miami, FL"], ["Años", "5 años"], ["Plan", client?.plan]] },
                { title: "Datos de Contacto", icon: Phone, fields: [["WhatsApp", "+1 (305) 555-0123"], ["Email", "hola@sabor.com"], ["Instagram", "@elsabor_miami"], ["Facebook", "/elsabormiami"]] },
                { title: "Identidad & Marca", icon: Star, fields: [["Estilo", "Moderno/Traditional"], ["Color Primario", "#D91B1B"], ["Color Secundario", "#F59E0B"], ["Tipografía", "Outfit / Inter"]] },
              ].map((section) => (
                <div key={section.title} className="bg-background border rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <section.icon size={16} className="text-primary" />
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-wider">{section.title}</h3>
                  </div>
                  <div className="space-y-4">
                    {section.fields.map(([label, value]) => (
                      <div key={label} className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest leading-none mb-1">{label}</span>
                        <span className="text-sm font-bold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="md:col-span-3 bg-background border rounded-[24px] p-6">
                <h3 className="font-black text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                  <FileText size={16} className="text-primary" /> Descripción Extendida
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground font-medium bg-secondary/20 p-6 rounded-2xl italic border border-dashed border-border/50">
                  "Somos un restaurante familiar fundado en 2019 con la misión de traer el verdadero sabor de Oaxaca a Miami. Nos especializamos en mole, tlayudas y tacos al pastor con ingredientes importados directamente de México. Mi padre empezó esto como un food truck y ahora tenemos nuestro local propio..."
                </p>
              </div>
            </div>
          )}

          {/* Tab Content: AI Proposal */}
          {tab === "ai" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-primary/5 to-blue-500/5 border border-primary/20 rounded-[32px] p-8 shadow-inner">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                      <Sparkles size={24} className="text-white animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Propuesta de Contenido AI</h2>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Generado con Claude 3.5 Sonnet</p>
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-xl font-bold bg-background/50">
                    <Zap size={14} className="mr-2" /> Regenerar con IA
                  </Button>
                </div>
                
                <div className="bg-background rounded-2xl border border-primary/10 overflow-hidden shadow-xl">
                  <div className="flex items-center gap-2 px-6 py-3 bg-secondary/50 border-b text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <FileText size={12} /> Master_document_v3.md
                  </div>
                  <pre className="font-mono text-[13px] whitespace-pre-wrap p-8 text-foreground leading-relaxed overflow-x-auto selection:bg-primary/20">
                    {mdContent}
                  </pre>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                  <Info size={20} className="text-amber-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900">Revisión AI Requerida</p>
                  <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
                    Hemos detectado que el cliente no proporcionó fotos del equipo. La IA ha sugerido usar imágenes de stock de alta calidad con temática latina para humanizar el sitio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Notes */}
          {tab === "notes" && (
            <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-background border rounded-[24px] p-6 shadow-sm">
                  <h3 className="font-black text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MessageSquare size={16} className="text-primary" /> Notas del Administrador
                  </h3>
                  <Textarea 
                    placeholder="Escribe notas privadas o instrucciones para el equipo de diseño..." 
                    className="min-h-[200px] rounded-2xl bg-secondary/20 border-border/50 focus:bg-background transition-all resize-none p-6 text-sm font-medium" 
                  />
                  <div className="mt-4 flex justify-end">
                    <Button className="rounded-xl font-bold">Guardar Nota</Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-background border rounded-[24px] p-6 shadow-sm">
                  <h3 className="font-black text-sm uppercase tracking-wider mb-6 flex items-center gap-2 text-muted-foreground">
                    <TrendingUp size={16} /> Historial
                  </h3>
                  <div className="space-y-6 relative ml-2">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-muted-foreground/10" />
                    {[
                      { date: "04 Abr, 10:20 AM", text: "Estado cambiado a 'Recibido'", user: "Admin" },
                      { date: "04 Abr, 10:15 AM", text: "Brief completado por el cliente", user: "Sistema" },
                      { date: "02 Abr, 09:00 AM", text: "Link de onboarding enviado", user: "IA Agent" },
                    ].map((item, i) => (
                      <div key={i} className="relative flex gap-4 pl-6">
                        <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-background shadow-sm ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">{item.date}</p>
                          <p className="text-xs font-bold mt-0.5">{item.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Autor: {item.user}</p>
                        </div>
                      </div>
                    ))}
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

/* DASHBOARD PAGE COMPONENT */
const Dashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [viewingClient, setViewingClient] = useState<string | null>(null);

  if (viewingClient) {
    return <ClientDetail clientId={viewingClient} onBack={() => setViewingClient(null)} />;
  }

  return (
    <div className="min-h-screen bg-secondary/10 overflow-x-hidden">
      {/* Sidebar / Header Combo */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/"><AcrosoftLogo size="sm" /></Link>
            <div className="h-4 w-[1px] bg-border hidden md:block" />
            <div className="hidden md:flex items-center gap-1 text-[10px] font-black text-muted-foreground/50 tracking-[0.2em] uppercase">
              <LayoutDashboard size={14} className="text-primary" /> Panel de Control
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-black text-foreground">Admin Daniel</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Super Usuario</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Var name="Admin_Initial" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} title="Cerrar Sesión" className="rounded-xl hover:bg-destructive/10 hover:text-destructive">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-10">
          
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight">¡Hola de nuevo, Daniel! 👋</h1>
              <p className="text-muted-foreground font-medium">Aquí está lo que está pasando con tus proyectos hoy.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/onboarding")} className="rounded-2xl h-12 px-6 font-black shadow-lg shadow-primary/20">
                <Var name="Btn_New_Client" />
              </Button>
            </div>
          </div>

          {/* Metrics Visualization */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((m) => (
              <div key={m.label} className="bg-background border rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${m.bg} rounded-full opacity-20 group-hover:scale-125 transition-transform duration-500`} />
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${m.bg} ${m.color}`}>
                    <m.icon size={20} />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                    {m.trend}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{m.label}</p>
                  <p className="text-3xl font-black text-foreground tracking-tight">{m.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Projects Table / Explorer */}
          <div className="bg-background border rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-black tracking-tight">Proyectos Recientes</h2>
                <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-widest">Gestionando {clients.length} clientes activos</p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    className="pl-12 h-12 bg-secondary/30 border-transparent focus:bg-background focus:border-primary/30 rounded-2xl text-sm font-bold transition-all" 
                    placeholder="Buscar por cliente o dominio..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                  />
                </div>
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-2">
                  <FolderOpen size={18} />
                </Button>
              </div>
            </div>

            {/* Modern Table Layout */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/10 text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] text-left border-b">
                    <th className="px-8 py-4">Cliente</th>
                    <th className="px-6 py-4">Servicio/Plan</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Ingreso</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-8 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.domain.toLowerCase().includes(search.toLowerCase())).map((c) => (
                    <tr key={c.id} className="hover:bg-primary/5 transition-all duration-300 group cursor-pointer" onClick={() => setViewingClient(c.id)}>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-black text-primary text-xs shadow-inner">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-sm text-foreground">{c.name}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 mt-0.5">
                              <Globe size={10} /> {c.domain}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant="outline" className="rounded-lg font-bold bg-secondary/50 border-none text-[10px] uppercase tracking-wider">{c.plan}</Badge>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusStyles[c.status]}`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 ${c.status === 'Recibido' ? 'bg-amber-500' : c.status === 'En progreso' ? 'bg-blue-500' : 'bg-emerald-500'} animate-pulse`} />
                          {c.status}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-black text-foreground">{c.revenue}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-xs font-bold text-muted-foreground">{c.date}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary hover:text-white transition-all">
                            <Eye size={16} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                            <Download size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-secondary/10 border-t flex items-center justify-between">
              <p className="text-[10px] font-black text-muted-foreground border bg-background rounded-full px-4 py-1.5 uppercase tracking-widest">
                Mostrando {clients.length} resultados
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled className="rounded-xl font-bold bg-background">Anterior</Button>
                <Button variant="outline" size="sm" disabled className="rounded-xl font-bold bg-background">Siguiente</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <p className="text-center text-[10px] font-black text-muted-foreground/30 mt-8 mb-20 uppercase tracking-[0.4em]">
        ACOSOFT LABS · INTERNAL ADMIN V3.0.4
      </p>
    </div>
  );
};

export default Dashboard;
