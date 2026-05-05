import { useParams, useSearchParams } from "react-router-dom";
import FormRenderer from "@/components/crm/FormRenderer";
import type { WidgetLang } from "@/hooks/useLangWidget";

const FormPage = () => {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const rawLang = searchParams.get("lang");
  const urlLang: WidgetLang | undefined = rawLang === "es" || rawLang === "en" ? rawLang : undefined;

  if (!formId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Formulario no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <FormRenderer formId={formId} lang={urlLang} />
    </div>
  );
};

export default FormPage;
