import { useParams } from "react-router-dom";
import FormRenderer from "@/components/crm/FormRenderer";

/**
 * Public standalone form page.
 * Route: /f/:formId
 *
 * Intentionally minimal — no header, no branding, no navigation.
 * Works as a blank iframe target or as a direct link.
 */
const FormPage = () => {
  const { formId } = useParams<{ formId: string }>();

  if (!formId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Formulario no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <FormRenderer formId={formId} />
    </div>
  );
};

export default FormPage;
