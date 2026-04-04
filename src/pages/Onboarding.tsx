import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, Shield, CheckCircle2, ArrowRight } from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import Var from "@/components/Var";
import { Link } from "react-router-dom";

// Modular Step Components
import Step1Business from "@/components/onboarding/Step1Business";
import Step2Plan from "@/components/onboarding/Step2Plan";
import Step3Identity from "@/components/onboarding/Step3Identity";
import Step4Services from "@/components/onboarding/Step4Services";
import Step5Audience from "@/components/onboarding/Step5Audience";
import Step6Content from "@/components/onboarding/Step6Content";
import Step7Contact from "@/components/onboarding/Step7Contact";
import Step8Confirm from "@/components/onboarding/Step8Confirm";

const STEP_NAMES = ["Negocio", "Plan", "Identidad", "Servicios", "Audiencia", "Contenido", "Contacto", "Confirmación"];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("single_page");

  const next = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep((s) => Math.min(s + 1, 7));
  };
  
  const prev = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep((s) => Math.max(s - 1, 0));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-md animate-in fade-in zoom-in duration-500">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/5 animate-bounce">
            <CheckCircle2 size={56} className="text-primary" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight">¡Todo listo!</h1>
            <p className="text-muted-foreground leading-relaxed">
              Hemos recibido tu información. Nuestro equipo y la IA están trabajando en tu propuesta bilingüe de Acrosoft Labs.
            </p>
          </div>
          <div className="bg-card border border-primary/20 rounded-2xl p-6 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">ID de seguimiento</span>
            <div className="mt-2 text-lg font-mono font-bold text-primary tracking-wider">
              <Var name="Submission_ID" />
            </div>
          </div>
          <Button asChild size="lg" className="w-full rounded-2xl font-bold">
            <Link to="/">Volver al inicio <ArrowRight size={18} className="ml-2" /></Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
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

      {/* Stepper Progress */}
      <div className="bg-card/50 border-b py-6 mb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Paso {step + 1} de 8</span>
              <h2 className="text-lg font-black tracking-tight">{STEP_NAMES[step]}</h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-muted-foreground">{Math.round(((step + 1) / 8) * 100)}% Completado</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 h-1.5">
            {STEP_NAMES.map((_, i) => (
              <div 
                key={i} 
                className={`h-full flex-1 rounded-full transition-all duration-500 ${
                  i <= step ? "bg-primary shadow-sm shadow-primary/20" : "bg-muted-foreground/10"
                }`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <main className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border/60 rounded-3xl p-8 md:p-10 shadow-xl shadow-foreground/5 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {step === 0 && <Step1Business />}
            {step === 1 && <Step2Plan selected={selectedPlan} onSelect={setSelectedPlan} />}
            {step === 2 && <Step3Identity />}
            {step === 3 && <Step4Services />}
            {step === 4 && <Step5Audience />}
            {step === 5 && <Step6Content />}
            {step === 6 && <Step7Contact />}
            {step === 7 && <Step8Confirm onSubmit={() => setSubmitted(true)} />}
            
            {/* Nav buttons */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-border/50">
              <Button 
                variant="ghost" 
                onClick={prev} 
                disabled={step === 0}
                className="rounded-xl h-12 px-6 font-bold text-muted-foreground hover:text-foreground transition-all"
              >
                <ChevronLeft size={18} className="mr-2" /> Anterior
              </Button>
              {step < 7 && (
                <Button 
                  onClick={next} 
                  className="rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Continuar <ChevronRight size={18} className="ml-2" />
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-center text-[10px] font-medium text-muted-foreground/40 mt-8 uppercase tracking-[0.2em]">
            Acrosoft Labs Onboarding System v3.0
          </p>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
