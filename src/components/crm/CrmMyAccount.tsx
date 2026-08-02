import { User, Mail, Phone, Loader2 } from "lucide-react";
import { useBusinessProfile, useUpsertBusinessProfile, useUpdateStaff } from "@/hooks/useCrmData";
import { useStaffPermissions } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CrmBusinessProfile, CrmStaff } from "@/lib/supabase";
import { validateEmail } from "@/lib/validators";
import { SectionCard, EditableField, PhoneEditableField } from "@/components/shared/BusinessFormFields";

const StaffAccountView = ({
  staff, canEdit, onUpdate,
}: {
  staff: CrmStaff;
  canEdit: boolean;
  onUpdate: (updates: { name?: string; description?: string | null }) => Promise<void>;
}) => (
  <SectionCard title="Información Personal" subtitle="Tus datos de perfil" icon={User} className="max-w-lg">
    <div className="space-y-4">
      <EditableField label="Nombre completo" value={staff.name} icon={User} readOnly={!canEdit} onSave={val => onUpdate({ name: val })} />
      <EditableField label="Email" value={staff.email} icon={Mail} readOnly onSave={() => Promise.resolve()} />
      <EditableField label="Cargo / Rol" value={staff.description ?? ""} readOnly={!canEdit} onSave={val => onUpdate({ description: val || null })} placeholder="Ej: Asesor de ventas" />
    </div>
  </SectionCard>
);

const OwnerAccountView = ({
  profile, update,
}: {
  profile: CrmBusinessProfile | null;
  update: (data: Partial<CrmBusinessProfile>) => Promise<void>;
}) => (
  <SectionCard title="Información Personal" subtitle="Tus datos de perfil y contacto" icon={User} className="max-w-lg">
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <EditableField label="Nombre" value={profile?.first_name || ""} icon={User} onSave={val => update({ first_name: val })} placeholder="Tu nombre" />
        <EditableField label="Apellido" value={profile?.last_name || ""} onSave={val => update({ last_name: val })} placeholder="Tu apellido" />
      </div>
      <EditableField label="Email de contacto" value={profile?.contact_email || ""} icon={Mail} onSave={val => update({ contact_email: val })} validate={validateEmail} placeholder="contacto@ejemplo.com" />
      <PhoneEditableField label="Teléfono" value={profile?.contact_phone || ""} icon={Phone} onSave={val => update({ contact_phone: val })} />
      <EditableField label="Rol / Cargo" value={profile?.role || ""} onSave={val => update({ role: val })} placeholder="Ej: CEO, Director" />
    </div>
  </SectionCard>
);

const CrmMyAccount = () => {
  const { isStaff, staffRecord, can } = useStaffPermissions();
  const { data: profile, isLoading }  = useBusinessProfile();
  const upsertProfile                 = useUpsertBusinessProfile();
  const updateStaff                   = useUpdateStaff();

  const handleUpdate = async (updates: Partial<CrmBusinessProfile>) => {
    await upsertProfile.mutateAsync(updates);
  };

  const handleUpdateStaff = async (updates: { name?: string; description?: string | null }) => {
    if (!staffRecord) return;
    await updateStaff.mutateAsync({ id: staffRecord.id, ...updates });
    toast.success("Información actualizada");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mi Cuenta</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tu información personal y de contacto</p>
      </div>

      {isStaff && staffRecord
        ? <StaffAccountView staff={staffRecord} canEdit={can("mi_negocio_personal", "edit")} onUpdate={handleUpdateStaff} />
        : <OwnerAccountView profile={profile} update={handleUpdate} />
      }
    </div>
  );
};

export default CrmMyAccount;
