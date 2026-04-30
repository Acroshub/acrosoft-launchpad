import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Globe, Sparkles, Zap, DollarSign, CalendarDays, Hammer, Rocket, Star, ArrowRight, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CalendarRenderer from "@/components/crm/CalendarRenderer";
import { useLandingProfile, useLandingServices } from "@/hooks/useCrmData";
import { useLang } from "@/hooks/useLanguage";
import { translations } from "@/i18n/landing";
import { useCurrentUser } from "@/hooks/useAuth";

const useLandingCalendar = (profile: { user_id: string; landing_calendar_id: string | null } | null | undefined) =>
  useQuery({
    queryKey: ["landing_calendar", profile?.user_id],
    queryFn: async () => {
      if (!profile) return null;
      if (profile.landing_calendar_id) return profile.landing_calendar_id;

      const { data } = await supabase
        .from("crm_calendar_config")
        .select("id")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!profile,
  });

const STEP_ICONS = [CalendarDays, Hammer, Rocket];
const BENEFIT_ICONS = [Globe, Sparkles, Zap, DollarSign];

const Index = () => {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();

  // Redirect SaaS clients (not admins) to their CRM after magic link auth
  useEffect(() => {
    if (!loading && user?.user_metadata?.account_type === "saas_client") {
      navigate("/crm", { replace: true });
    }
  }, [user, loading, navigate]);

  const { data: adminProfile } = useLandingProfile();
  const { data: landingCalendarId } = useLandingCalendar(adminProfile);
  const { data: services = [] } = useLandingServices(adminProfile?.user_id);
  const { lang } = useLang();
  const T = translations[lang];

  const steps = T.steps.items.map((item, i) => ({ icon: STEP_ICONS[i], ...item }));
  const benefits = T.benefits.map((item, i) => ({ icon: BENEFIT_ICONS[i], ...item }));
  return (
  <div className="min-h-screen bg-background selection:bg-primary/10">
    <Navbar />

    {/* Hero Section */}
    <section className="relative overflow-hidden pt-20 pb-20 md:pt-32 md:pb-32">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none opacity-50">
        <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-blue-400/20 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase">
              <Star size={14} className="fill-primary" /> {T.hero.badge}
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
              {T.hero.h1a} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">{T.hero.h1b}</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
              {T.hero.p}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="h-14 px-8 rounded-2xl font-black text-lg shadow-xl shadow-primary/25 hover:scale-105 transition-all group">
                <a href="#agendar">
                  {T.hero.cta1} <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-2xl font-bold border-2 border-border hover:bg-secondary hover:border-primary/30 text-foreground transition-all">
                <a href="#como-funciona">{T.hero.cta2}</a>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                    {i === 4 ? "+50" : <Users size={16} className="text-muted-foreground" />}
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                <span className="text-foreground font-bold">{T.hero.socialBold}</span> {T.hero.social}
              </p>
            </div>
          </div>

          {/* Calendar — zona de agendado */}
          <div id="agendar" className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 scroll-mt-20">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-blue-400/20 rounded-[40px] blur-2xl -z-10 opacity-60" />
            {/* Clean calendar widget — minimal, embeddable design */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden p-6">
              {landingCalendarId ? (
                <CalendarRenderer calendarId={landingCalendarId} lang={lang} />
              ) : (
                <div className="text-center py-8 space-y-2">
                  <CalendarDays size={28} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-400">{T.calendar.empty}</p>
                  <p className="text-xs text-gray-300">{T.calendar.sub}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Trusted By */}
    <div className="container mx-auto px-4 pb-20">
      <p className="text-center text-xs font-bold text-muted-foreground/50 uppercase tracking-[0.3em] mb-8">{T.trusted.label}</p>
      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale">
        {T.trusted.industries.map((text) => (
          <span key={text} className="text-sm font-black tracking-tighter">{text}</span>
        ))}
      </div>
    </div>

    {/* Planes Section */}
    <section id="planes" className="relative bg-secondary/30 py-24 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors">{T.plans.badge}</Badge>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">{T.plans.h2}</h2>
          <p className="text-lg text-muted-foreground">{T.plans.p}</p>
        </div>

        <div className={`grid gap-8 max-w-6xl mx-auto ${services.length === 2 ? "md:grid-cols-2" : services.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-1 max-w-sm"}`}>
          {services.map((svc) => {
            const popular = svc.is_recommended ?? false;
            const features = svc.benefits ?? [];
            return (
              <div
                key={svc.id}
                className={`flex flex-col bg-background rounded-[32px] p-8 border-2 transition-all duration-500 hover:-translate-y-2 relative group ${
                  popular
                    ? "border-amber-400/60 shadow-xl shadow-amber-500/10"
                    : "hover:border-primary/50"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${popular ? "from-amber-500/10 to-amber-600/5" : "from-primary/10 to-primary/5"} opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px] -z-10`} />

                {popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-500/30">
                    {T.plans.recommended}
                  </Badge>
                )}

                <div className="space-y-2 mb-8">
                  <h3 className="text-xl font-bold">{svc.name}</h3>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {svc.discount_pct > 0 ? (
                      <>
                        <span className="text-xl font-bold text-muted-foreground/50 line-through">${svc.price.toLocaleString()}</span>
                        <span className="text-4xl font-black text-primary">${(svc.price * (1 - svc.discount_pct / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-black text-foreground">${svc.price.toLocaleString()}</span>
                    )}
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {svc.is_recurring && svc.recurring_price == null
                        ? `/ ${svc.recurring_label ? svc.recurring_label.replace(/^[/\s]+/, "") : (svc.recurring_interval ?? "mes")}`
                        : svc.is_recurring
                        ? T.plans.setupLabel
                        : T.plans.oneTime}
                    </span>
                  </div>
                  {svc.is_recurring && svc.recurring_price != null && (
                    <div className="flex items-center gap-2 font-bold">
                      <Badge variant="secondary" className={popular ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}>
                        {(svc.recurring_discount_pct ?? 0) > 0 ? (
                          <>
                            <span className="line-through opacity-60 mr-1">${svc.recurring_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            ${Math.round(svc.recurring_price * (1 - (svc.recurring_discount_pct ?? 0) / 100)).toLocaleString()}
                          </>
                        ) : (
                          `$${svc.recurring_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        )} / {svc.recurring_label ? svc.recurring_label.replace(/^[/\s]+/, "") : (svc.recurring_interval ?? "mes")}
                      </Badge>
                    </div>
                  )}
                  {svc.description && (
                    <p className="text-sm text-muted-foreground pt-1">{svc.description}</p>
                  )}
                </div>

                <ul className="space-y-4 mb-10 flex-grow">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${popular ? "bg-amber-500/10" : "bg-primary/10"}`}>
                        <Check size={12} className={popular ? "text-amber-500" : "text-primary"} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="space-y-6 pt-6 border-t border-border/50">
                  {svc.delivery_time && (
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-muted-foreground uppercase tracking-tight">{T.plans.deliveryLabel}</span>
                      <span className="text-foreground">{svc.delivery_time}</span>
                    </div>
                  )}
                  <Button
                    asChild
                    className={`w-full h-14 rounded-2xl font-black text-base transition-all hover:scale-[1.02] ${
                      popular ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25" : ""
                    }`}
                    variant={popular ? "default" : "outline"}
                  >
                    <a href="#agendar">{T.plans.cta}</a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    {/* Cómo funciona */}
    <section id="como-funciona" className="py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <Badge variant="outline" className="border-primary/30 text-primary">{T.steps.badge}</Badge>
          <h2 className="text-4xl font-black">{T.steps.h2}</h2>
          <p className="text-muted-foreground font-medium">{T.steps.p}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto relative">
          <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -z-10" />

          {steps.map((step, i) => (
            <div key={step.title} className="text-center space-y-6 group">
              <div className="relative mx-auto w-24 h-24 rounded-[32px] bg-secondary flex items-center justify-center transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-primary group-hover:shadow-xl group-hover:shadow-primary/30">
                <step.icon size={40} className="text-primary group-hover:text-white transition-colors" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-black">
                  {i + 1}
                </div>
              </div>
              <div className="space-y-2 px-4">
                <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Why Acrosoft / Benefits */}
    <section className="bg-card py-24 md:py-32 border-y">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {T.why.h2a} <span className="text-primary">Acrosoft?</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {T.why.p}
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-background rounded-2xl border border-border/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="text-emerald-500" size={20} />
                </div>
                <p className="text-sm font-bold">{T.why.check1}</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-background rounded-2xl border border-border/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="text-emerald-500" size={20} />
                </div>
                <p className="text-sm font-bold">{T.why.check2}</p>
              </div>
            </div>
            <Button asChild size="lg" className="rounded-2xl font-black px-10 h-14">
              <a href="#agendar">{T.why.cta}</a>
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="bg-background rounded-3xl p-8 border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all group">
                <b.icon size={32} className="text-primary mb-6 transition-transform group-hover:scale-110" />
                <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* CTA Final */}
    <section className="bg-primary py-24 md:py-40 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="container mx-auto px-4 text-center space-y-10 relative">
        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight max-w-4xl mx-auto">
          {T.cta.h2}
        </h2>
        <p className="text-xl text-white/80 max-w-2xl mx-auto font-medium">
          {T.cta.p}
        </p>
        <Button asChild size="lg" className="h-16 px-12 rounded-2xl bg-white text-primary hover:bg-white/90 font-extrabold text-xl shadow-2xl transition-all hover:scale-105">
          <a href="#agendar" className="flex items-center gap-3">
            <CalendarDays size={22} /> {T.cta.btn}
          </a>
        </Button>
      </div>
    </section>

    <Footer />
  </div>
  );
};

export default Index;
