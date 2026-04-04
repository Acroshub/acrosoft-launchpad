import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Users, FolderOpen, CheckCircle, DollarSign, Search, Eye, Download, ArrowLeft, LogOut, FileText, MessageSquare, Info } from "lucide-react";
import AcrosoftLogo from "@/components/AcrosoftLogo";
import Var from "@/components/Var";
import { Link } from "react-router-dom";

const clients = [
  { id: "1", name: "Client_1_Name", plan: "Client_1_Plan", status: "Recibido", date: "Client_1_Date", domain: "Client_1_Domain" },
  { id: "2", name: "Client_2_Name", plan: "Client_2_Plan", status: "En progreso", date: "Client_2_Date", domain: "Client_2_Domain" },
  { id: "3", name: "Client_3_Name", plan: "Client_3_Plan", status: "Entregado", date: "Client_3_Date", domain: "Client_3_Domain" },
  { id: "4", name: "Client_4_Name", plan: "Client_4_Plan", status: "En progreso", date: "Client_4_Date", domain: "Client_4_Domain" },
  { id: "5", name: "Client_5_Name", plan: "Client_5_Plan", status: "Recibido", date: "Client_5_Date", domain: "Client_5_Domain" },
  { id: "6", name: "Client_6_Name", plan: "Client_6_Plan", status: "Entregado", date: "Client_6_Date", domain: "Client_6_Domain" },
];

const statusColor: Record<string, string> = {
  "Recibido": "bg-warning/10 text-warning border-warning/30",
  "En progreso": "bg-primary/10 text-primary border-primary/30",
  "Entregado": "bg-success/10 text-success border-success/30",
};

const metrics = [
  { icon: Users, label: "Total clientes", value: "Total_Clients" },
  { icon: FolderOpen, label: "Proyectos activos", value: "Active_Projects" },
  { icon: CheckCircle, label: "Entregados este mes", value: "Delivered_This_Month" },
  { icon: DollarSign, label: "MRR", value: "Monthly_Recurring_Revenue", prefix: "$" },
];

/* LOGIN SCREEN */
const AdminLogin = ({ onLogin }: { onLogin: () => void }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="bg-card border rounded-xl p-8 w-full max-w-sm space-y-6 shadow-lg">
      <div className="flex justify-center"><AcrosoftLogo size="md" /></div>
      <h2 className="text-lg font-bold text-center">Acceso exclusivo Acrosoft</h2>
      <div className="space-y-3">
        <Input placeholder="{{Admin_Email}}" type="email" />
        <Input placeholder="{{Admin_Password}}" type="password" />
      </div>
      <Button onClick={onLogin} className="w-full">Ingresar</Button>
    </div>
  </div>
);

/* DASHBOARD */
const AdminDashboard = ({ onLogout, onViewClient }: { onLogout: () => void; onViewClient: (id: string) => void }) => {
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/"><AcrosoftLogo size="sm" /></Link>
            <span className="text-sm text-muted-foreground hidden sm:inline">Panel de Administración</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary"><Var name="Admin_Name" /></Badge>
            <Button variant="outline" size="sm" onClick={onLogout}><LogOut size={14} className="mr-1" /> Cerrar sesión</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((m) => (
            <div key={m.label} className="bg-card border rounded-xl p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <m.icon size={18} />
                <span className="text-xs font-medium">{m.label}</span>
              </div>
              <div className="text-xl font-bold">{m.prefix}<Var name={m.value} /></div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border rounded-xl">
          <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="font-bold">Todos los proyectos</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8 text-sm" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-secondary/50 text-muted-foreground text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Dominio</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr></thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr key={c.id} className="border-b hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3 font-medium"><Var name={c.name} /></td>
                    <td className="px-4 py-3"><Var name={c.plan} /></td>
                    <td className="px-4 py-3"><Badge variant="outline" className={statusColor[c.status]}>{c.status}</Badge></td>
                    <td className="px-4 py-3"><Var name={c.date} /></td>
                    <td className="px-4 py-3"><Var name={c.domain} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => onViewClient(c.id)}><Eye size={14} className="mr-1" /> Ver</Button>
                        <Button size="sm" variant="ghost"><Download size={14} className="mr-1" /> .md</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-4 space-y-3">
            {clients.map((c, i) => (
              <div key={c.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium"><Var name={c.name} /></span>
                  <Badge variant="outline" className={statusColor[c.status]}>{c.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex gap-3">
                  <Var name={c.plan} /> · <Var name={c.date} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => onViewClient(c.id)}><Eye size={14} className="mr-1" /> Ver</Button>
                  <Button size="sm" variant="outline"><Download size={14} className="mr-1" /> .md</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

/* CLIENT DETAIL */
const ClientDetail = ({ clientId, onBack }: { clientId: string; onBack: () => void }) => {
  const [tab, setTab] = useState<"info" | "doc" | "notes">("info");

  const mdContent = `# {{Client_Business_Name}} — Brief de Proyecto
Plan: {{Client_Plan}} · ${{Plan_Price}} setup · ${{Plan_Monthly}}/mes
Fecha: {{Project_Date}}

## BRIEF DE DISEÑO
Rubro: {{Client_Industry}}
Ubicación: {{Client_City_State}}
Colores: {{Brand_Color_Primary}} · {{Brand_Color_Secondary}}
Estilo: {{Client_Visual_Style}}
Dominio: {{Client_Domain}}

## HERO
Headline ES: {{AI_Hero_Headline_ES}}
Headline EN: {{AI_Hero_Headline_EN}}
Subheadline ES: {{AI_Subheadline_ES}}
Subheadline EN: {{AI_Subheadline_EN}}

## SERVICIOS
{{Client_Service_1_Name}}: {{AI_Service_1_Description_ES}}
{{Client_Service_2_Name}}: {{AI_Service_2_Description_ES}}

## SEO LOCAL
Keyword ES: {{AI_SEO_Keyword_ES}}
Keyword EN: {{AI_SEO_Keyword_EN}}
Meta title ES: {{AI_Meta_Title_ES}}
Meta description ES: {{AI_Meta_Description_ES}}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
            <ArrowLeft size={14} className="mr-1" /> Volver al dashboard
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold"><Var name="Client_Business_Name" /></h1>
              <Badge><Var name={`Client_${clientId}_Plan`} /></Badge>
              <select className="border rounded px-2 py-1 text-sm bg-background">
                <option>Recibido</option><option>En progreso</option><option>Entregado</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm"><Download size={14} className="mr-1" /> Descargar .md</Button>
              <Button size="sm" variant="outline">Regenerar copy con IA</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit mb-6">
          {([["info", "Información", Info], ["doc", "Documento Maestro", FileText], ["notes", "Notas internas", MessageSquare]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="grid sm:grid-cols-2 gap-4 animate-fade-in">
            {[
              ["Negocio", [["Nombre", "Client_Business_Name"], ["Industria", "Client_Industry"], ["Ubicación", "Client_City_State"]]],
              ["Plan", [["Plan", "Client_Plan"], ["Pago", "Client_Payment_Method"], ["Inicio", "Client_Start_Date"]]],
              ["Contacto", [["Teléfono", "Client_Phone"], ["Email", "Client_Email"], ["Dominio", "Client_Domain"]]],
              ["Redes", [["Instagram", "Client_Instagram"], ["Facebook", "Client_Facebook"], ["TikTok", "Client_TikTok"]]],
              ["Identidad", [["Estilo", "Client_Visual_Style"], ["Color 1", "Client_Brand_Primary"], ["Color 2", "Client_Brand_Secondary"]]],
              ["Servicios", [["Servicio 1", "Client_Service_1_Name"], ["Servicio 2", "Client_Service_2_Name"], ["Servicio 3", "Client_Service_3_Name"]]],
            ].map(([title, fields]) => (
              <div key={title as string} className="bg-card border rounded-xl p-5">
                <h3 className="font-semibold mb-3 text-sm text-muted-foreground">{title as string}</h3>
                <div className="space-y-2">
                  {(fields as string[][]).map(([label, varName]) => (
                    <div key={varName} className="flex justify-between items-center">
                      <span className="text-sm">{label}</span>
                      <Var name={varName} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "doc" && (
          <div className="bg-card border rounded-xl p-6 animate-fade-in">
            <pre className="font-mono text-sm whitespace-pre-wrap bg-secondary/50 rounded-lg p-6 text-foreground leading-relaxed">
              {mdContent}
            </pre>
          </div>
        )}

        {tab === "notes" && (
          <div className="bg-card border rounded-xl p-6 space-y-4 animate-fade-in">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notas internas</label>
              <Textarea placeholder="{{Admin_Notes}}" className="min-h-[120px]" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Historial de cambios</label>
              <div className="bg-secondary/50 rounded-lg p-4 text-sm space-y-1 text-muted-foreground">
                <div><Var name="Status_Change_Log" /></div>
              </div>
            </div>
            <Button>Guardar notas</Button>
          </div>
        )}
      </main>
    </div>
  );
};

/* MAIN ADMIN COMPONENT */
const Admin = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [viewingClient, setViewingClient] = useState<string | null>(null);

  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  if (viewingClient) return <ClientDetail clientId={viewingClient} onBack={() => setViewingClient(null)} />;
  return <AdminDashboard onLogout={() => setLoggedIn(false)} onViewClient={setViewingClient} />;
};

export default Admin;
