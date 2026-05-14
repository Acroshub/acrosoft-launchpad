import { useState } from "react";
import { Plus, Trash2, Loader2, UserCheck, Edit2, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PhoneInput from "@/components/shared/PhoneInput";
import { toast } from "sonner";
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import type { CrmVendor } from "@/lib/supabase";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

const STATUS_LABEL: Record<CrmVendor["status"], string> = {
  invited: "Invitado",
  active:  "Activo",
  inactive: "Inactivo",
};

const STATUS_COLOR: Record<CrmVendor["status"], string> = {
  invited:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  active:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-secondary text-muted-foreground",
};

// ─── Create / Edit Dialog ──────────────────────────────────────────────────────

interface VendorFormData {
  name: string;
  email: string;
  whatsapp: string;
  commission_pct: number;
  slug: string;
}

const defaultForm = (): VendorFormData => ({
  name: "",
  email: "",
  whatsapp: "",
  commission_pct: 10,
  slug: "",
});

const toSlug = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CrmVendor | null;
}

const VendorDialog = ({ open, onOpenChange, editing }: VendorDialogProps) => {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const [form, setForm] = useState<VendorFormData>(() =>
    editing
      ? { name: editing.name, email: editing.email, whatsapp: editing.whatsapp ?? "", commission_pct: editing.commission_pct, slug: editing.slug }
      : defaultForm()
  );
  const [inviting, setInviting] = useState(false);

  const setField = <K extends keyof VendorFormData>(k: K, v: VendorFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: editing ? f.slug : toSlug(name) }));
  };

  const canSubmit = form.name.trim() && form.email.trim() && form.slug.trim() && form.commission_pct >= 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setInviting(true);
    try {
      if (editing) {
        await updateVendor.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          whatsapp: form.whatsapp.trim() || null,
          commission_pct: form.commission_pct,
          slug: form.slug.trim(),
        });
        toast.success("Vendedor actualizado");
        onOpenChange(false);
      } else {
        // Create vendor record
        const vendor = await createVendor.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim(),
          whatsapp: form.whatsapp.trim() || undefined,
          commission_pct: form.commission_pct,
          slug: form.slug.trim(),
        });

        // Send invitation email via Supabase invite
        const { error } = await supabase.functions.invoke("invite-vendor-user", {
          body: { email: form.email.trim(), vendor_id: vendor.id, name: form.name.trim() },
        });
        if (error) throw error;

        toast.success("Vendedor creado e invitación enviada");
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar vendedor");
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {editing ? "Editar vendedor" : "Nuevo vendedor"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
            <Input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: María López"
              className="h-9 text-sm"
            />
          </div>

          {!editing && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Correo electrónico *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="vendedor@email.com"
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Se enviará una invitación a este correo.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">WhatsApp</label>
            <PhoneInput
              value={form.whatsapp}
              onChange={(v) => setField("whatsapp", v)}
              placeholder="71234567"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">% Comisión *</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={form.commission_pct}
                onChange={(e) => setField("commission_pct", Number(e.target.value))}
                className="h-9 text-sm w-28"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Porcentaje sobre cada venta registrada (pagos iniciales y mantenimientos).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Slug (identificador) *</label>
            <Input
              value={form.slug}
              onChange={(e) => setField("slug", toSlug(e.target.value))}
              placeholder="maria-lopez"
              className="h-9 text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Se usará en los links de seguimiento: <span className="font-mono">?ref={form.slug || "slug"}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || inviting}
            className="rounded-xl"
          >
            {inviting && <Loader2 size={13} className="animate-spin mr-1.5" />}
            {editing ? "Guardar" : "Crear y enviar invitación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Vendor Row ────────────────────────────────────────────────────────────────

interface VendorRowProps {
  vendor: CrmVendor;
  onEdit: (v: CrmVendor) => void;
  onDelete: (v: CrmVendor) => void;
}

const VendorRow = ({ vendor, onEdit, onDelete }: VendorRowProps) => {
  const [resending, setResending] = useState(false);

  const copySlug = () => {
    navigator.clipboard.writeText(vendor.slug);
    toast.success("Slug copiado");
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.functions.invoke("invite-vendor-user", {
        body: { email: vendor.email, vendor_id: vendor.id, name: vendor.name, resend: true },
      });
      if (error) throw error;
      toast.success("Invitación reenviada");
    } catch {
      toast.error("Error al reenviar la invitación");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card border rounded-2xl hover:border-primary/20 transition-all">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-primary">{vendor.name.charAt(0).toUpperCase()}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">{vendor.name}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[vendor.status]}`}>
            {STATUS_LABEL[vendor.status]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{vendor.email}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-[11px] text-muted-foreground">
            Comisión: <strong className="text-foreground">{vendor.commission_pct}%</strong>
          </span>
          <button
            onClick={copySlug}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            <Copy size={10} /> {vendor.slug}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 shrink-0">
        {vendor.status === "invited" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleResend}
            disabled={resending}
            title="Reenviar invitación"
          >
            {resending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(vendor)}>
          <Edit2 size={13} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(vendor)}
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const CrmVendors = () => {
  const { data: vendors = [], isLoading } = useVendors();
  const deleteVendor = useDeleteVendor();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<CrmVendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<CrmVendor | null>(null);

  const handleEdit = (v: CrmVendor) => {
    setEditingVendor(v);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) setEditingVendor(null);
    setDialogOpen(open);
  };

  const handleConfirmDelete = async () => {
    if (!deletingVendor) return;
    try {
      await deleteVendor.mutateAsync(deletingVendor.id);
      toast.success("Vendedor eliminado");
    } catch {
      toast.error("Error al eliminar vendedor");
    } finally {
      setDeletingVendor(null);
    }
  };

  return (
    <>
      <DeleteConfirmDialog
        open={!!deletingVendor}
        onOpenChange={(v) => { if (!v) setDeletingVendor(null); }}
        onConfirm={handleConfirmDelete}
        isPending={deleteVendor.isPending}
        description={`Se eliminará a ${deletingVendor?.name} permanentemente. Sus contactos y ventas no se verán afectados.`}
      />

      {dialogOpen && (
        <VendorDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          editing={editingVendor}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Vendedores</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestiona tu equipo de vendedores y sus comisiones
            </p>
          </div>
          <Button
            onClick={() => { setEditingVendor(null); setDialogOpen(true); }}
            className="rounded-xl gap-1.5 shrink-0"
          >
            <Plus size={14} /> Nuevo vendedor
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="bg-card border rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
              <UserCheck size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Sin vendedores todavía</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Agrega vendedores para que gestionen sus propios calendarios, contactos y registren ventas bajo tu negocio.
            </p>
            <Button
              variant="outline"
              className="rounded-xl gap-1.5"
              onClick={() => { setEditingVendor(null); setDialogOpen(true); }}
            >
              <Plus size={13} /> Agregar primer vendedor
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {vendors.map((v) => (
              <VendorRow
                key={v.id}
                vendor={v}
                onEdit={handleEdit}
                onDelete={setDeletingVendor}
              />
            ))}
          </div>
        )}

        {vendors.length > 0 && (
          <div className="bg-secondary/30 border rounded-2xl p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Resumen</p>
            <div className="flex gap-6 flex-wrap">
              <span>Total: <strong className="text-foreground">{vendors.length}</strong></span>
              <span>Activos: <strong className="text-foreground">{vendors.filter(v => v.status === "active").length}</strong></span>
              <span>Invitados: <strong className="text-foreground">{vendors.filter(v => v.status === "invited").length}</strong></span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CrmVendors;
