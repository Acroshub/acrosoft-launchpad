import { useState } from "react";
import { BookOpen, FileText, ChevronRight } from "lucide-react";
import { useStaffPermissions } from "@/hooks/useAuth";
import CrmCourses from "./CrmCourses";
import CrmProductos from "./CrmProductos";

type Panel = "menu" | "cursos" | "archivos";

const CrmProductosDigitales = ({
  isSuperAdmin = false,
  isSaasClient = false,
}: {
  isSuperAdmin?: boolean;
  isSaasClient?: boolean;
}) => {
  const { isStaff, can } = useStaffPermissions();
  const canRead    = !isStaff || can("productos_digitales", "read");
  const showCursos = !isStaff && (isSaasClient || isSuperAdmin);

  const [panel, setPanel] = useState<Panel>("menu");

  if (panel === "cursos" && showCursos) return <CrmCourses onExit={() => setPanel("menu")} />;

  if (panel === "archivos" && canRead) return (
    <CrmProductos
      kind="archivo"
      canEdit={!isStaff || can("productos_digitales", "edit")}
      canCreate={!isStaff || can("productos_digitales", "create")}
      canDelete={!isStaff || can("productos_digitales", "delete")}
      onExit={() => setPanel("menu")}
    />
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <FileText size={18} className="text-primary" /> Productos Digitales
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Cursos, ebooks y archivos que ofreces a tus clientes.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {showCursos && (
          <button onClick={() => setPanel("cursos")}
            className="flex flex-col items-start gap-3 p-5 bg-card border rounded-2xl hover:border-primary/40 hover:bg-secondary/30 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Cursos</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Cursos y contenido educativo para tus clientes.</p>
            </div>
            <ChevronRight size={13} className="text-muted-foreground mt-auto self-end" />
          </button>
        )}

        {canRead && (
          <button onClick={() => setPanel("archivos")}
            className="flex flex-col items-start gap-3 p-5 bg-card border rounded-2xl hover:border-primary/40 hover:bg-secondary/30 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Ebooks y Archivos</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Libros, plantillas y otros archivos descargables.</p>
            </div>
            <ChevronRight size={13} className="text-muted-foreground mt-auto self-end" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CrmProductosDigitales;
