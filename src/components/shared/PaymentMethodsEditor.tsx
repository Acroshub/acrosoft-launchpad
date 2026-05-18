import { useState, useRef } from "react";
import { Plus, Trash2, Loader2, CreditCard, Link, QrCode, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePaymentMethods, useUpsertPaymentMethod, useDeletePaymentMethod } from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CrmPaymentMethod } from "@/lib/supabase";

const TYPE_OPTIONS = [
  { value: "bank_transfer", label: "Transferencia bancaria", icon: CreditCard },
  { value: "payment_link",  label: "Link de pago",           icon: Link },
  { value: "qr_code",       label: "Código QR",              icon: QrCode },
] as const;

const BLANK: Omit<CrmPaymentMethod, "id" | "created_at" | "user_id"> = {
  entity_type: "service",
  entity_id: "",
  type: "bank_transfer",
  label: "",
  content: "",
  sort_order: 0,
};

function TypeIcon({ type }: { type: CrmPaymentMethod["type"] }) {
  const opt = TYPE_OPTIONS.find(o => o.value === type);
  const Icon = opt?.icon ?? CreditCard;
  return <Icon size={13} className="text-muted-foreground shrink-0" />;
}

function MethodForm({
  value,
  entityType,
  entityId,
  onSave,
  onCancel,
  saving,
}: {
  value: Partial<CrmPaymentMethod>;
  entityType: CrmPaymentMethod["entity_type"];
  entityId: string;
  onSave: (v: Partial<CrmPaymentMethod>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { user } = useCurrentUser();
  const [type, setType]     = useState<CrmPaymentMethod["type"]>(value.type ?? "bank_transfer");
  const [label, setLabel]   = useState(value.label ?? "");
  // Contenido separado por tipo para no perder datos al cambiar de tab
  const [contentByType, setContentByType] = useState<Record<CrmPaymentMethod["type"], string>>({
    bank_transfer: value.type === "bank_transfer" ? (value.content ?? "") : "",
    payment_link:  value.type === "payment_link"  ? (value.content ?? "") : "",
    qr_code:       value.type === "qr_code"       ? (value.content ?? "") : "",
  });
  const content = contentByType[type];
  const setContent = (v: string) => setContentByType(prev => ({ ...prev, [type]: v }));
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const handleQrUpload = async (file: File) => {
    if (!user) return;
    setUploadingQr(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("payment-qr").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("payment-qr").getPublicUrl(path);
      setContent(data.publicUrl);
      toast.success("QR subido");
    } catch (e: any) {
      toast.error(e.message?.slice(0, 80) ?? "Error al subir QR");
    } finally { setUploadingQr(false); }
  };

  return (
    <div className="bg-secondary/30 rounded-xl p-4 space-y-3 border border-border/60">
      {/* Tipo */}
      <div className="flex gap-2">
        {TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setType(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              type === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-secondary"
            }`}
          >
            <opt.icon size={12} /> {opt.label}
          </button>
        ))}
      </div>

      {/* Etiqueta */}
      <Input
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder={
          type === "bank_transfer" ? "Ej: Banco XYZ — Cuenta Corriente" :
          type === "payment_link"  ? "Ej: PayPal, Stripe, Binance..." :
          "Ej: QR Transfermóvil"
        }
        className="h-8 text-sm"
      />

      {/* Contenido según tipo */}
      {type === "bank_transfer" && (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={"Banco: XYZ\nCuenta: 1234-5678\nTitular: Nombre\nCCI: ..."}
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      )}

      {type === "payment_link" && (
        <Input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="https://paypal.me/tu-usuario"
          className="h-8 text-sm font-mono"
        />
      )}

      {type === "qr_code" && (
        <div className="space-y-2">
          <input
            ref={qrInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleQrUpload(f); e.target.value = ""; }}
          />
          {content ? (
            <div className="flex items-center gap-3">
              <img src={content} alt="QR" className="w-20 h-20 object-contain rounded-lg border" />
              <Button variant="outline" size="sm" onClick={() => qrInputRef.current?.click()} className="h-8 text-xs">
                Cambiar imagen
              </Button>
            </div>
          ) : (
            <Button
              variant="outline" size="sm"
              onClick={() => qrInputRef.current?.click()}
              disabled={uploadingQr}
              className="h-8 text-xs gap-1.5"
            >
              {uploadingQr ? <Loader2 size={12} className="animate-spin" /> : <QrCode size={12} />}
              {uploadingQr ? "Subiendo..." : "Subir imagen QR"}
            </Button>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => onSave({ ...value, type, label: label || null, content, entity_type: entityType, entity_id: entityId })}
          disabled={saving || !content.trim() || uploadingQr}
          className="h-7 text-xs gap-1"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Guardar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-7 text-xs gap-1">
          <X size={11} /> Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function PaymentMethodsEditor({
  entityType,
  entityId,
}: {
  entityType: CrmPaymentMethod["entity_type"];
  entityId: string | null;
}) {
  const { data: methods = [] } = usePaymentMethods(entityType, entityId);
  const upsert = useUpsertPaymentMethod();
  const remove = useDeletePaymentMethod();
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [showNew, setShowNew]       = useState(false);

  const handleSave = async (v: Partial<CrmPaymentMethod>) => {
    if (!entityId) return;
    await upsert.mutateAsync({
      ...(v.id ? { id: v.id } : {}),
      entity_type: entityType,
      entity_id: entityId,
      type: v.type!,
      label: v.label ?? null,
      content: v.content!,
      sort_order: v.sort_order ?? methods.length,
    });
    setEditingId(null);
    setShowNew(false);
  };

  const handleDelete = async (pm: CrmPaymentMethod) => {
    if (!entityId) return;
    await remove.mutateAsync({ id: pm.id, entityType, entityId });
  };

  if (!entityId) return (
    <p className="text-xs text-muted-foreground/60 italic">Guarda primero para añadir métodos de pago.</p>
  );

  return (
    <div className="space-y-3">
      {methods.length === 0 && !showNew && (
        <p className="text-xs text-muted-foreground/60 italic">Sin métodos de pago configurados.</p>
      )}

      {methods.map(pm => (
        editingId === pm.id ? (
          <MethodForm
            key={pm.id}
            value={pm}
            entityType={entityType}
            entityId={entityId}
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
            saving={upsert.isPending}
          />
        ) : (
          <div key={pm.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 bg-card">
            <TypeIcon type={pm.type} />
            <div className="flex-1 min-w-0">
              {pm.label && <p className="text-xs font-medium">{pm.label}</p>}
              {pm.type === "qr_code" ? (
                <img src={pm.content} alt="QR" className="w-14 h-14 object-contain rounded mt-1 border" />
              ) : pm.type === "payment_link" ? (
                <a href={pm.content} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary underline underline-offset-2 truncate block max-w-xs">
                  {pm.content}
                </a>
              ) : (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{pm.content}</pre>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditingId(pm.id)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                <Pencil size={12} />
              </button>
              <button onClick={() => handleDelete(pm)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )
      ))}

      {showNew && (
        <MethodForm
          value={{ ...BLANK, entity_type: entityType, entity_id: entityId, sort_order: methods.length }}
          entityType={entityType}
          entityId={entityId}
          onSave={handleSave}
          onCancel={() => setShowNew(false)}
          saving={upsert.isPending}
        />
      )}

      {!showNew && (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={12} /> Añadir método de pago
        </button>
      )}
    </div>
  );
}
