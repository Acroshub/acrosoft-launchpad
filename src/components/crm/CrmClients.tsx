import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, FolderOpen, CheckCircle, DollarSign, Search, Eye, Download,
  ArrowLeft, FileText, MessageSquare, Info, Star, Zap,
  TrendingUp, Calendar, Globe, Phone, Pencil,
  Image as ImageIcon, Target, Briefcase, Link as LinkIcon, ImagePlus, Archive,
} from "lucide-react";
import Var from "@/components/Var";

// {VAR_DB} — datos reales vendrán de Supabase

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
  { icon: Users,       label: "Total clientes",    value: "{VAR_DB}", showTrend: false },
  { icon: FolderOpen,  label: "Proyectos activos", value: "{VAR_DB}", showTrend: false },
  { icon: CheckCircle, label: "Entregados (mes)",  value: "{VAR_DB}", showTrend: false },
  { icon: DollarSign,  label: "MRR",               value: "{VAR_DB}", showTrend: true, trend: "{VAR_DB}" },
];

// ─── Client Detail ────────────────────────────────────────────────────────────
const ClientDetail = ({ clientId, onBack }: { clientId: string; onBack: () => void }) => {
  const [tab, setTab] = useState<"info" | "notes">("info");
  const client = clients.find((c) => c.id === clientId);

  return (
    <div className="space-y-6">
      {/* Back header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg hover:bg-secondary gap-2">
          <ArrowLeft size={15} /> Volver
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">{client?.name || "{VAR_DB}"}</h1>
            <Badge variant="outline" className={statusStyles[client?.status || "Recibido"]}>
              {client?.status || "{VAR_DB}"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <Calendar size={11} /> Recibido el {client?.date || "{VAR_DB}"}
            <span className="text-border">·</span>
            <Globe size={11} /> {client?.domain || "{VAR_DB}"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-background border rounded-xl w-fit">
        {([["info", "Ficha Técnica", Info], ["notes", "Notas & Log", MessageSquare]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
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
              fields: [["Rubro", "{VAR_DB}"], ["Ciudad", "{VAR_DB}"], ["Años", "{VAR_DB}"], ["Plan", client?.plan || "{VAR_DB}"]],
            },
            {
              title: "Datos de Contacto",
              icon: Phone,
              fields: [["WhatsApp", "{VAR_DB}"], ["Email", "{VAR_DB}"], ["Instagram", "{VAR_DB}"], ["Facebook", "{VAR_DB}"]],
            },
            {
              title: "Identidad & Marca",
              icon: Star,
              fields: [["Estilo", "{VAR_DB}"], ["Color Primario", "{VAR_DB}"], ["Color Acento", "{VAR_DB}"], ["Tipografía", "{VAR_DB}"]],
            },
          ].map((section) => (
            <div key={section.title} className="bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <section.icon size={14} className="text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5">
                  <Pencil size={14} />
                </Button>
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

          <div className="md:col-span-2 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción del Negocio</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5">
                <Pencil size={14} />
              </Button>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground bg-secondary/30 p-5 rounded-xl border border-dashed border-border/60 italic min-h-[120px]">
              {"{VAR_DB}"}
            </p>
          </div>

          <div className="md:col-span-1 bg-secondary/20 border border-border/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 h-full">
            <div className="w-14 h-14 rounded-2xl bg-background border flex items-center justify-center shadow-sm mb-2">
              <Archive size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Kit del Cliente</h3>
              <Badge variant="outline" className="mt-2 bg-background/50 border-primary/20 text-[10px] text-primary whitespace-nowrap">
                1 DOC + {"{VAR_DB_COUNT}"} IMÁGENES
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-3 px-2 leading-relaxed">
                Incluye Documento Maestro (.md), Logo e Imágenes de Referencia.
              </p>
            </div>
            <Button variant="default" className="w-full mt-2 h-11 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
              <Download size={14} className="mr-2 shrink-0" /> DESCARGAR TODO (.ZIP)
            </Button>
          </div>

          <div className="md:col-span-2 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Servicios & Oferta</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5">
                <Pencil size={14} />
              </Button>
            </div>
            <div className="space-y-3">
              {[1, 2].map((s) => (
                <div key={s} className="bg-secondary/20 border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold">{"{VAR_DB}"} Nombre del Servicio</h4>
                      {s === 1 && <Badge className="bg-amber-100/50 text-amber-600 hover:bg-amber-100/50 text-[9px] px-1.5 py-0 border-amber-200">ESTRELLA</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{"{VAR_DB}"} Descripción breve...</p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-0.5">Precio</span>
                    <span className="text-sm font-bold">{"{VAR_DB}"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-1 bg-background border rounded-2xl p-5 border-border/50 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logotipo</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5">
                <Pencil size={14} />
              </Button>
            </div>
            <div className="flex-1 bg-secondary/30 border border-dashed border-border/60 rounded-xl flex items-center justify-center p-6 min-h-[140px] relative">
              <div className="absolute inset-0 flex items-center justify-center flex-col text-muted-foreground/50">
                <ImageIcon size={32} className="mb-2 opacity-50" />
                <span className="text-[10px] uppercase tracking-widest font-medium">{"{VAR_DB_LOGO_URL}"}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Público Objetivo</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5">
                <Pencil size={14} />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[["Perfil general", "{VAR_DB}"], ["Rango de edad", "{VAR_DB}"]].map(([label, value]) => (
                <div key={label} className="bg-secondary/20 border border-border/50 rounded-xl p-4">
                  <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-1 block">{label}</span>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
              <div className="sm:col-span-2 bg-secondary/20 border border-border/50 rounded-xl p-4">
                <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-1 block">Problema que resolvemos</span>
                <p className="text-sm">{"{VAR_DB}"}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-1 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon size={14} className="text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inspiración</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5">
                <Pencil size={14} />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest block">Sitios de Referencia</span>
                <div className="flex flex-col gap-2">
                  {["{VAR_DB_URL_1}", "{VAR_DB_URL_2}"].map((url) => (
                    <div key={url} className="text-xs text-primary bg-primary/5 flex items-center gap-2 p-2 rounded-lg border border-primary/10 truncate">
                      <LinkIcon size={10} className="shrink-0" /> {url}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest block">Imágenes Subidas</span>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square bg-secondary/40 rounded-lg flex items-center justify-center border border-border/50 text-muted-foreground/30">
                      <ImagePlus size={16} />
                    </div>
                  ))}
                </div>
              </div>
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
              <Textarea
                defaultValue="{VAR_DB}"
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
  );
};

// ─── Clients list ─────────────────────────────────────────────────────────────
const CrmClients = () => {
  const [search, setSearch]           = useState("");
  const [viewingClient, setViewing]   = useState<string | null>(null);

  if (viewingClient) {
    return <ClientDetail clientId={viewingClient} onBack={() => setViewing(null)} />;
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Panel de proyectos y clientes de Acrosoft Labs</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <m.icon size={16} className="text-muted-foreground" />
              {m.showTrend && (
                <span className="text-[10px] font-medium text-muted-foreground border rounded-full px-2 py-0.5">
                  {m.trend}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
            <p className="text-2xl font-semibold">—</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Proyectos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{"{VAR_DB}"} clientes activos</p>
          </div>
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-9 bg-secondary/30 border-transparent focus:bg-background focus:border-border rounded-xl text-sm"
              placeholder="Buscar cliente o dominio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                {["Cliente", "Plan", "Estado", "Ingreso", "Fecha", "Acciones"].map((h, i) => (
                  <th key={h} className={`px-${i === 0 || i === 5 ? 6 : 4} py-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest ${i === 5 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => setViewing(c.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-semibold">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Globe size={10} /> {c.domain}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{c.plan}</td>
                  <td className="px-4 py-4">
                    <Badge variant="outline" className={`text-[10px] font-medium rounded-full ${statusStyles[c.status] || ""}`}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium">{c.revenue}</td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{c.date}</td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={(e) => { e.stopPropagation(); setViewing(c.id); }}
                      title="Ver ficha"
                    >
                      <Eye size={15} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={(e) => e.stopPropagation()}
                      title="Descargar"
                    >
                      <Download size={15} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{"{VAR_DB}"} resultados</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled className="rounded-lg text-xs">Anterior</Button>
            <Button variant="outline" size="sm" disabled className="rounded-lg text-xs">Siguiente</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrmClients;
