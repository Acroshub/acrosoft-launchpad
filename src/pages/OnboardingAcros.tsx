import { useEffect, useState } from "react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import FormRenderer from "@/components/crm/FormRenderer";
import { addNoindex } from "@/lib/piscinasFunnel";
import { isEstimadosPreview } from "@/lib/estimadosPreview";

// /onboarding-acros — formulario de onboarding de clientes nuevos (Google Ads + Facebook Ads).
// El formulario NO está en el código: es un formulario del CRM (tabla crm_forms, slug «onboarding-acros», cuenta superadmin) que se edita desde
// CRM › Formularios. Lo renderiza el mismo motor de /f/:formId (variante "tabs": pestañas + avance) y al enviarse crea el contacto con la etiqueta
// «onboarding-acros» (Edge Function crm-form-public). Campos condicionales (`showIf`) y `helpText` los entiende el FormRenderer, pero el editor de
// formularios del CRM todavía no los muestra: se conservan al guardar solo si el editor no los reescribe. Nace con noindex.
// Vista previa para recorrer todas las pantallas sin llenar nada (nada es obligatorio y al enviar NO se guarda ningún contacto): `?demo=1` en desarrollo o
// `?demo=<ESTIMADOS_PREVIEW_KEY>` en producción (la misma clave del embudo de estimados). Con `&paso=exito` abre directo la pantalla de éxito.
const ONBOARDING_FORM_ID = "2b6d1dae-110e-4e23-9442-540210d4d03d";

const PAGE_TITLE = "Onboarding | Acros Software";

// Paleta de marca (teal) aplicada solo a esta página: el resto del CRM sigue con su azul.
const BRAND_VARS = {
  "--primary": "175 77% 26%",
  "--primary-foreground": "0 0% 100%",
  "--ring": "175 77% 26%",
} as React.CSSProperties;

const OnboardingAcros = () => {
  const [preview] = useState(() => isEstimadosPreview());
  const [previewSuccess] = useState(() => new URLSearchParams(window.location.search).get("paso") === "exito");

  useEffect(() => {
    document.title = PAGE_TITLE;
    return addNoindex();
  }, []);

  return (
    <div className="min-h-screen bg-white" style={BRAND_VARS}>
      <header className="border-b border-border/60 bg-white">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex h-16 max-w-2xl items-center">
            <a href="/" aria-label="Acros Software">
              <AcrosoftLogo size="md" />
            </a>
          </div>
        </div>
      </header>

      {preview && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900">
          Vista previa: nada es obligatorio y al enviar no se guarda ningún contacto.
        </div>
      )}

      <FormRenderer
        formId={ONBOARDING_FORM_ID}
        variant="tabs"
        preview={preview}
        previewSuccess={previewSuccess}
        heading={<h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Empecemos con tu negocio</h1>}
      />
    </div>
  );
};

export default OnboardingAcros;
