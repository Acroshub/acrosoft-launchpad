import { useMemo, useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PhoneInput from "@/components/shared/PhoneInput";
import { useCreateContact } from "@/hooks/useCrmData";
import { validateEmail, validatePhone } from "@/lib/validators";
import type { CrmContact } from "@/lib/supabase";

const initials = (name: string) => (name.trim().substring(0, 2).toUpperCase() || "?");

type ContactPickerProps = {
  contacts: CrmContact[];
  value: string;
  onChange: (contactId: string) => void;
  placeholder?: string;
  /** Si true, el contacto nuevo exige correo (además del nombre). Si false, exige correo O teléfono. */
  requireEmail?: boolean;
  size?: "sm" | "md";
};

const ContactPicker = ({
  contacts, value, onChange,
  placeholder = "Buscar por nombre, correo o teléfono...",
  requireEmail = false,
  size = "md",
}: ContactPickerProps) => {
  const createContact = useCreateContact();
  const selected = contacts.find(c => c.id === value) ?? null;

  const [search, setSearch]     = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [errors, setErrors]     = useState<{ name?: string; email?: string; phone?: string }>({});
  const [saving, setSaving]     = useState(false);

  const H    = size === "sm" ? "h-9"   : "h-12";
  const TEXT = size === "sm" ? "text-xs" : "text-sm";

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      !!c.email?.toLowerCase().includes(q) ||
      !!c.phone?.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [contacts, search]);

  const startCreate = () => {
    const q = search.trim();
    const looksLikeEmail = q.includes("@");
    const looksLikePhone = !looksLikeEmail && q.replace(/\D/g, "").length >= 5;
    setNewName(!looksLikeEmail && !looksLikePhone ? q : "");
    setNewEmail(looksLikeEmail ? q : "");
    setNewPhone(looksLikePhone ? q : "");
    setErrors({});
    setCreating(true);
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewName(""); setNewEmail(""); setNewPhone(""); setErrors({});
  };

  const handleSelect = (c: CrmContact) => {
    setSearch("");
    onChange(c.id);
  };

  const validateCreate = () => {
    const errs: typeof errors = {};
    if (!newName.trim()) errs.name = "El nombre es obligatorio";

    const emailErr = validateEmail(newEmail);
    if (emailErr) errs.email = emailErr;
    const phoneErr = validatePhone(newPhone);
    if (phoneErr) errs.phone = phoneErr;

    if (requireEmail) {
      if (!newEmail.trim()) errs.email = errs.email ?? "El correo es obligatorio";
    } else if (!newEmail.trim() && !newPhone.trim()) {
      errs.email = errs.email ?? "Ingresa correo o teléfono";
      errs.phone = errs.phone ?? "Ingresa correo o teléfono";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setSaving(true);
    try {
      const created = await createContact.mutateAsync({
        name: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        company: null,
        tags: [],
      });
      toast.success("Contacto creado");
      cancelCreate();
      onChange(created.id);
    } catch {
      toast.error("Error al crear el contacto");
    } finally {
      setSaving(false);
    }
  };

  if (selected) {
    return (
      <div className={`flex items-center gap-2.5 ${H} px-3.5 rounded-xl border border-border bg-card`}>
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
          {initials(selected.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`${TEXT} font-medium truncate leading-tight`}>{selected.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{selected.email ?? selected.phone ?? "—"}</p>
        </div>
        <button type="button" onClick={() => onChange("")}
          className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="border rounded-xl p-3.5 space-y-2.5 bg-card">
        <p className="text-xs font-semibold text-muted-foreground">Nuevo contacto</p>
        <div className="space-y-1">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre completo *" className="h-9 text-sm" autoFocus />
          {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            placeholder={requireEmail ? "Correo *" : "Correo"} className="h-9 text-sm" />
          {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <PhoneInput value={newPhone} onChange={setNewPhone} placeholder="Teléfono" />
          {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
        </div>
        {!requireEmail && <p className="text-[10px] text-muted-foreground/60">Ingresa correo o teléfono (al menos uno).</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={cancelCreate}>Cancelar</Button>
          <Button type="button" size="sm" className="flex-1 gap-1.5" onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 size={12} className="animate-spin" />} Crear y usar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder} className={`${H} ${TEXT}`} />
      {search.trim() && (
        <div className="absolute z-10 mt-1.5 w-full border rounded-xl overflow-hidden divide-y bg-card shadow-lg">
          {results.map(c => (
            <button key={c.id} type="button" onClick={() => handleSelect(c)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/60 transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                {initials(c.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.email ?? c.phone ?? "—"}</p>
              </div>
            </button>
          ))}
          <button type="button" onClick={startCreate}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors text-primary">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus size={13} />
            </div>
            <p className="text-xs font-semibold">Crear contacto nuevo{search.trim() ? `: "${search.trim()}"` : ""}</p>
          </button>
        </div>
      )}
    </div>
  );
};

export default ContactPicker;
