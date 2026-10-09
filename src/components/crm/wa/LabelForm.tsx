import { useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MetaEventSelect } from "@/components/crm/CrmWaMetaEvents";

export interface LabelFormValues {
  name: string;
  color: string;
  hint: string | null;
  remove_hint: string | null;
  meta_event: string | null;
  product_id: string | null;
}

export interface LabelFormInitial extends LabelFormValues {
  id?: string;
  status?: "active" | "draft";
}

// Vista completa para crear o editar una etiqueta (reemplaza a la edición dentro de la lista).
export default function LabelForm({ initial, colors, products, saving, onSave, onCancel }: {
  initial: LabelFormInitial | null;           // null = etiqueta nueva
  colors: string[];
  products: { id: string; name: string }[];
  saving: boolean;
  onSave: (values: LabelFormValues) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? colors[0]);
  const [hint, setHint] = useState(initial?.hint ?? "");
  const [removeHint, setRemoveHint] = useState(initial?.remove_hint ?? "");
  const [metaEvent, setMetaEvent] = useState<string | null>(initial?.meta_event ?? null);
  const [productId, setProductId] = useState<string | null>(initial?.product_id ?? null);
  const [improving, setImproving] = useState<"add" | "remove" | null>(null);

  const isEdit = !!initial?.id;
  const isDraft = initial?.status === "draft";

  const improve = async (kind: "add" | "remove") => {
    const text = kind === "add" ? hint : removeHint;
    setImproving(kind);
    try {
      const { data, error } = await supabase.functions.invoke("improve-label-hint", {
        body: { hint: text, labelName: name || "etiqueta", ...(kind === "remove" ? { type: "remove" } : {}) },
      });
      if (error) { toast.error("No se pudo mejorar la sugerencia"); return; }
      if (data?.improved) (kind === "add" ? setHint : setRemoveHint)(data.improved);
    } finally { setImproving(null); }
  };

  const ImproveButton = ({ kind, text }: { kind: "add" | "remove"; text: string }) => text.trim() ? (
    <button
      type="button"
      disabled={improving !== null}
      onClick={() => improve(kind)}
      className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50"
    >
      {improving === kind ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
      {improving === kind ? "Mejorando..." : "Mejorar con IA"}
    </button>
  ) : null;

  return (
    <div className="rounded-xl border border-dashed border-border p-3 space-y-2.5">
      <p className="text-xs font-medium text-muted-foreground">{isEdit ? "Editar etiqueta" : "Nueva etiqueta"}</p>
      <div className="flex gap-1 flex-wrap">
        {colors.map(c => (
          <button key={c} type="button" onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full border-2 transition-all"
            style={{ backgroundColor: c, borderColor: color === c ? "#000" : "transparent" }}
          />
        ))}
      </div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nombre de la etiqueta"
        autoFocus={!isEdit}
        className="w-full h-8 px-2.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cuándo asignar</label>
        <textarea
          value={hint}
          onChange={e => setHint(e.target.value)}
          placeholder="ej: cuando el usuario pregunta por precios o quiere comprar"
          rows={2}
          className="w-full px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <ImproveButton kind="add" text={hint} />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cuándo quitar</label>
        <textarea
          value={removeHint}
          onChange={e => setRemoveHint(e.target.value)}
          placeholder="ej: cuando el usuario envía comprobante de pago o confirma el pago"
          rows={2}
          className="w-full px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <ImproveButton kind="remove" text={removeHint} />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Producto (opcional)</label>
        <select
          value={productId ?? ""}
          onChange={e => setProductId(e.target.value || null)}
          className="w-full h-8 px-2 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none"
        >
          <option value="">Todos los productos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p className="text-[10px] text-muted-foreground/60 leading-snug">
          Si eliges un producto, la IA solo usa esta etiqueta en chats de ese producto, y la compra se envía a Meta con el valor de la venta de ese producto.
        </p>
      </div>
      <MetaEventSelect value={metaEvent} onChange={setMetaEvent} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 rounded-lg border text-xs hover:bg-secondary transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave({
            name: name.trim(), color,
            hint: hint.trim() || null, remove_hint: removeHint.trim() || null,
            meta_event: metaEvent, product_id: productId,
          })}
          disabled={!name.trim() || saving}
          className="flex-1 flex items-center justify-center gap-1 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : !isEdit && <Plus size={12} />}
          {isDraft ? "Guardar y activar" : isEdit ? "Guardar cambios" : "Crear etiqueta"}
        </button>
      </div>
    </div>
  );
}
