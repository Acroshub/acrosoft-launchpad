import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import FormRenderer from "@/components/crm/FormRenderer";

const ONBOARDING_FORM_ID = "b733e0c5-60d4-414d-896a-5ce459b07eaf";

const Onboarding = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/"><AcrosoftLogo size="sm" /></Link>
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground border rounded-full px-3 py-1 bg-secondary/50">
              <Shield size={12} className="text-primary" /> PROTEGIDO CON SSL
            </div>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground border rounded-full px-3 py-1 bg-secondary/50 uppercase tracking-widest">
              <span>ES</span><span className="text-primary/30">/</span><span>EN</span>
            </div>
          </div>
        </div>
      </header>

      {/* Form — entirely driven by the CRM form configuration */}
      <FormRenderer formId={ONBOARDING_FORM_ID} />
    </div>
  );
};

export default Onboarding;
