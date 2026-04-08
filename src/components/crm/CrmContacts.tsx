import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, Users, Mail, Phone, Calendar, X, Eye,
  ArrowLeft, FolderOpen, Star, FileText, MessageSquare,
  TrendingUp, Briefcase, Target, ImagePlus, Tag, Plus,
  Download, Archive, Pencil, Image as ImageIcon, Link as LinkIconLucide, Loader2,
} from "lucide-react";
import { useContacts, useCreateContact, useUpdateContact } from "@/hooks/useCrmData";
import type { CrmContact } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Ficha técnica (solo superadmin) ─────────────────────────────────────────
const ClientDetail = ({ onBack }: { contactId: string; onBack: () => void }) => {
  const [tab, setTab] = useState<"info" | "notes">("info");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg hover:bg-secondary gap-2">
          <ArrowLeft size={15} /> Volver
        </Button>
        <div>
          <div className="flex items-center gap-2">
            {/* {VAR_DB} — nombre y estado del contacto */}
            <h1 className="text-base font-semibold">{"{VAR_DB}"}</h1>
            <Badge variant="outline" className="bg-primary/8 text-primary border-primary/20 text-[10px]">
              {"{VAR_DB}"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <Calendar size={11} /> Recibido el {"{VAR_DB}"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-background border rounded-xl w-fit">
        {([["info", "Ficha Técnica", FileText], ["notes", "Notas & Log", MessageSquare]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="grid md:grid-cols-3 gap-4 animate-in fade-in duration-300">
          {[
            { title: "Información del Negocio", icon: FolderOpen, fields: [["Rubro","{VAR_DB}"],["Ciudad","{VAR_DB}"],["Años","{VAR_DB}"],["Plan","{VAR_DB}"]] },
            { title: "Datos de Contacto",       icon: Phone,      fields: [["WhatsApp","{VAR_DB}"],["Email","{VAR_DB}"],["Instagram","{VAR_DB}"],["Facebook","{VAR_DB}"]] },
            { title: "Identidad & Marca",        icon: Star,       fields: [["Estilo","{VAR_DB}"],["Color Primario","{VAR_DB}"],["Color Acento","{VAR_DB}"],["Tipografía","{VAR_DB}"]] },
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
                  <div key={label}>
                    <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5 block">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5"><Pencil size={14} /></Button>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground bg-secondary/30 p-5 rounded-xl border border-dashed border-border/60 italic min-h-[120px]">{"{VAR_DB}"}</p>
          </div>

          <div className="md:col-span-1 bg-secondary/20 border border-border/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-background border flex items-center justify-center shadow-sm">
              <Archive size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Kit del Cliente</h3>
              <Badge variant="outline" className="mt-2 bg-background/50 border-primary/20 text-[10px] text-primary">1 DOC + {"{VAR_DB_COUNT}"} IMÁGENES</Badge>
              <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">Incluye Documento Maestro (.md), Logo e Imágenes.</p>
            </div>
            <Button variant="default" className="w-full h-10 rounded-xl font-bold text-[10px] uppercase tracking-wider">
              <Download size={13} className="mr-2" /> DESCARGAR TODO (.ZIP)
            </Button>
          </div>

          <div className="md:col-span-2 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Briefcase size={14} className="text-muted-foreground" /><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Servicios & Oferta</h3></div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5"><Pencil size={14} /></Button>
            </div>
            <div className="space-y-3">
              {[1, 2].map((s) => (
                <div key={s} className="bg-secondary/20 border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold">{"{VAR_DB}"}</h4>
                      {s === 1 && <Badge className="bg-amber-100/50 text-amber-600 hover:bg-amber-100/50 text-[9px] px-1.5 py-0 border-amber-200">ESTRELLA</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{"{VAR_DB}"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-0.5">Precio</span>
                    <span className="text-sm font-bold">{"{VAR_DB}"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-1 bg-background border rounded-2xl p-5 border-border/50 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><ImageIcon size={14} className="text-muted-foreground" /><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logotipo</h3></div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5"><Pencil size={14} /></Button>
            </div>
            <div className="flex-1 bg-secondary/30 border border-dashed border-border/60 rounded-xl flex items-center justify-center p-6 min-h-[140px]">
              <div className="flex flex-col items-center text-muted-foreground/50">
                <ImageIcon size={32} className="mb-2 opacity-50" />
                <span className="text-[10px] uppercase tracking-widest font-medium">{"{VAR_DB_LOGO_URL}"}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-background border rounded-2xl p-5 border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Target size={14} className="text-muted-foreground" /><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Público Objetivo</h3></div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5"><Pencil size={14} /></Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[["Perfil general","{VAR_DB}"],["Rango de edad","{VAR_DB}"]].map(([l,v]) => (
                <div key={l} className="bg-secondary/20 border border-border/50 rounded-xl p-4">
                  <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-1 block">{l}</span>
                  <p className="text-sm font-medium">{v}</p>
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
              <div className="flex items-center gap-2"><LinkIconLucide size={14} className="text-muted-foreground" /><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inspiración</h3></div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/5"><Pencil size={14} /></Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest block">Sitios de Referencia</span>
                {["{VAR_DB_URL_1}","{VAR_DB_URL_2}"].map((url) => (
                  <div key={url} className="text-xs text-primary bg-primary/5 flex items-center gap-2 p-2 rounded-lg border border-primary/10 truncate">
                    <LinkIconLucide size={10} className="shrink-0" /> {url}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest block">Imágenes Subidas</span>
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3].map((i) => (
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

      {tab === "notes" && (
        <div className="grid md:grid-cols-3 gap-4 animate-in fade-in duration-300">
          <div className="md:col-span-2 bg-background border rounded-2xl p-5">
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

// ─── Contacts list ────────────────────────────────────────────────────────────
const CrmContacts = ({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) => {
  const { data: contacts = [], isLoading } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<string | null>(null);
  const [viewing, setViewing]       = useState<string | null>(null);
  const [tagInputId, setTagInputId] = useState<string | null>(null);
  const [tagValue, setTagValue]     = useState("");

  // New contact dialog
  const [showNew, setShowNew]       = useState(false);
  const [newName, setNewName]       = useState("");
  const [newEmail, setNewEmail]     = useState("");
  const [newPhone, setNewPhone]     = useState("");
  const [newCompany, setNewCompany] = useState("");

  // Superadmin: show full ficha técnica
  if (viewing && isSuperAdmin) {
    return <ClientDetail contactId={viewing} onBack={() => setViewing(null)} />;
  }

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search)
  );

  const detail = contacts.find((c) => c.id === selected);

  const addTag = async (id: string) => {
    if (!tagValue.trim()) return;
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;
    const newTags = [...(contact.tags ?? []), tagValue.trim()];
    await updateContact.mutateAsync({ id, tags: newTags });
    setTagValue("");
    setTagInputId(null);
  };

  const removeTag = async (id: string, tag: string) => {
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;
    const newTags = (contact.tags ?? []).filter((t) => t !== tag);
    await updateContact.mutateAsync({ id, tags: newTags });
  };

  const handleCreateContact = async () => {
    if (!newName.trim()) return;
    try {
      await createContact.mutateAsync({
        name: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        company: newCompany.trim() || null,
        stage: "lead",
        tags: [],
      });
      toast.success("Contacto creado exitosamente");
      setShowNew(false);
      setNewName(""); setNewEmail(""); setNewPhone(""); setNewCompany("");
    } catch {
      toast.error("Error al crear el contacto");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contactos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Todos los contactos registrados en el CRM</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="rounded-xl gap-2 h-9 text-xs font-medium">
          <Plus size={14} /> Nuevo contacto
        </Button>
      </div>

      {/* New contact dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Nuevo Contacto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre completo" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@ejemplo.com" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Teléfono</label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+1 555 123 4567" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresa</label>
              <Input value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Nombre de la empresa" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreateContact} disabled={!newName.trim() || createContact.isPending} className="rounded-xl">
              {createContact.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Guardar contacto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Lista */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-secondary/30 border-transparent"
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0 font-medium">
              {filtered.length} contactos
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay contactos registrados aún.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => (
                <div key={c.id} className="space-y-0">
                  <div
                    className={`px-5 py-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors ${selected === c.id ? "bg-primary/5" : ""}`}
                  >
                    <button
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => setSelected(c.id === selected ? null : c.id)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          {/* Stage status */}
                          <Badge variant="outline" className="text-[10px] px-2 py-0 shrink-0 border-primary/20 bg-primary/5 text-primary">
                            {c.stage}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.email ?? "Sin email"}</p>
                      </div>
                    </button>

                    {/* Tag button */}
                    <button
                      onClick={() => { setTagInputId(tagInputId === c.id ? null : c.id); setTagValue(""); }}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0"
                      title="Añadir etiqueta"
                    >
                      <Tag size={14} />
                    </button>
                  </div>

                  {/* Inline tag input */}
                  {tagInputId === c.id && (
                    <div className="px-5 pb-3 flex items-center gap-2">
                      <Input
                        autoFocus
                        value={tagValue}
                        onChange={(e) => setTagValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addTag(c.id); if (e.key === "Escape") setTagInputId(null); }}
                        placeholder="Nueva etiqueta..."
                        className="h-7 text-xs flex-1"
                      />
                      <button
                        onClick={() => addTag(c.id)}
                        className="p-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel de detalle */}
        <div className="bg-card border rounded-2xl p-5 h-fit">
          {detail ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-sm font-semibold shrink-0">
                    {detail.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{detail.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Desde {new Date(detail.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Etapa</span>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-primary">
                  {detail.stage}
                </Badge>
              </div>

              <div className="space-y-3">
                <a href={`mailto:${detail.email}`} className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Mail size={13} className="shrink-0" /><span className="truncate">{detail.email ?? "Sin email"}</span>
                </a>
                <a href={`tel:${detail.phone}`} className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Phone size={13} className="shrink-0" /><span>{detail.phone ?? "Sin teléfono"}</span>
                </a>
              </div>

              {/* Tags */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">Etiquetas</p>
                <div className="flex flex-wrap gap-1.5">
                  {(detail.tags ?? []).map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] border rounded-full px-2 py-0.5 bg-secondary/50">
                      {tag}
                      <button onClick={() => removeTag(detail.id, tag)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => { setTagInputId(detail.id); setTagValue(""); }}
                    className="flex items-center gap-1 text-[10px] border border-dashed rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    <Plus size={9} /> Añadir
                  </button>
                </div>
                {tagInputId === detail.id && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      autoFocus
                      value={tagValue}
                      onChange={(e) => setTagValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addTag(detail.id); if (e.key === "Escape") setTagInputId(null); }}
                      placeholder="Nueva etiqueta..."
                      className="h-7 text-xs flex-1"
                    />
                    <button onClick={() => addTag(detail.id)} className="p-1 rounded-md bg-primary text-primary-foreground">
                      <Plus size={13} />
                    </button>
                  </div>
                )}
              </div>

              {detail.notes && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Notas</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{detail.notes}</p>
                </div>
              )}

              {/* Ver Ficha Técnica — solo superadmin */}
              {isSuperAdmin && (
                <Button
                  className="w-full h-9 rounded-xl text-xs font-medium gap-2 mt-1"
                  onClick={() => setViewing(detail.id)}
                >
                  <Eye size={14} />
                  Ver Ficha Técnica
                </Button>
              )}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Users size={22} className="text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Selecciona un contacto para ver los detalles</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default CrmContacts;
