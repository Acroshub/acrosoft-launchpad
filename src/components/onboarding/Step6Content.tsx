import { Camera, Users, Video, Upload } from "lucide-react";
import { SectionTitle, Field } from "./FormHelpers";

const Step6Content = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle
        title="Contenido visual"
        subtitle="Las fotos y videos reales de tu negocio aumentan la confianza de tus clientes."
      />

      <div className="grid gap-8">
        {/* Galería principal */}
        <Field label="Fotos del negocio (Galería principal)" required>
          <div className="group relative border-2 border-dashed border-muted-foreground/20 rounded-2xl p-14 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
            <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
              <Camera className="text-primary w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-foreground">Sube hasta 10 fotos de tu negocio</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Muestra tu local, tus herramientas de trabajo y tus mejores resultados.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <span className="text-[10px] bg-secondary px-3 py-1 rounded-full font-medium uppercase tracking-wider text-muted-foreground">JPG</span>
              <span className="text-[10px] bg-secondary px-3 py-1 rounded-full font-medium uppercase tracking-wider text-muted-foreground">PNG</span>
              <span className="text-[10px] bg-secondary px-3 py-1 rounded-full font-medium uppercase tracking-wider text-muted-foreground">MÁX. 10MB</span>
            </div>
          </div>
        </Field>

        {/* Equipo y Video */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Fotos del equipo */}
          <Field label="Fotos del equipo — Opcional">
            <div className="group border-2 border-dashed border-muted-foreground/20 rounded-2xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer h-full">
              <div className="mx-auto w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                <Users className="text-primary w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">Sube hasta 5 fotos del equipo</p>
              <p className="text-xs text-muted-foreground mt-1.5">Humaniza tu marca con fotos reales de las personas detrás del negocio.</p>
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-background border rounded-lg text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
                <Upload size={13} /> Seleccionar fotos
              </div>
            </div>
          </Field>

          {/* Video de presentación */}
          <Field label="Video de presentación — Opcional">
            <div className="group border-2 border-dashed border-muted-foreground/20 rounded-2xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer h-full">
              <div className="mx-auto w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                <Video className="text-primary w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">Sube 1 video de presentación</p>
              <p className="text-xs text-muted-foreground mt-1.5">Un video corto que muestre tu negocio o equipo en acción.</p>
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-background border rounded-lg text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
                <Upload size={13} /> Seleccionar video
              </div>
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
};

export default Step6Content;
