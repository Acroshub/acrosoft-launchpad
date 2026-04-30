import { useParams } from "react-router-dom";
import FormRenderer from "@/components/crm/FormRenderer";
import { useLangWidget } from "@/hooks/useLangWidget";
import { widgetTranslations } from "@/i18n/widgets";

const FormPage = () => {
  const { formId } = useParams<{ formId: string }>();
  const lang = useLangWidget();
  const T = widgetTranslations[lang].form;

  if (!formId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">{T.notFound}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <FormRenderer formId={formId} lang={lang} />
    </div>
  );
};

export default FormPage;
