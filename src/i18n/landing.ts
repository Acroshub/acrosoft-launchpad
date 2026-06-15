export const translations = {
  es: {
    nav: {
      services: "Servicios",
      howItWorks: "Cómo funciona",
      plans: "Planes",
      cta: "Agendar Llamada",
    },
    hero: {
      badge: "+50 negocios latinos atendidos en EE.UU.",
      h1a: "Sin página web, estás perdiendo",
      h1b: "clientes.",
      p: "Sitios web profesionales para negocios latinos en EE.UU. En español, en 7 días, sin pagar precios de agencia americana.",
      cta1: "Agendar Llamada",
      cta2: "Ver planes y precios",
      socialBold: "+50 negocios",
      social: "ya están creciendo con nosotros.",
    },
    calendar: {
      empty: "Crea un calendario en el CRM",
      sub: "Aparecerá aquí automáticamente.",
    },
    trusted: {
      label: "Especialistas en Industrias de Servicios",
      industries: ["RESTAURANTES", "SALONES DE BELLEZA", "CONSTRUCCIÓN", "CLÍNICAS DENTALES", "SERVICIOS LEGALES"],
    },
    plans: {
      badge: "Precios Claros",
      h2: "Inversión Inteligente para tu Negocio",
      p: "Selecciona el plan que se adapte a tu etapa actual. Escala cuando estés listo.",
      recommended: "MÁS RECOMENDADO",
      setupLabel: "Setup inicial",
      oneTime: "Pago único",
      deliveryLabel: "Tiempo de entrega:",
      cta: "Agendar Llamada",
    },
    steps: {
      badge: "Flujo de Trabajo",
      h2: "Tu página lista en 3 pasos",
      p: "Hemos optimizado el proceso para que no pierdas tiempo.",
      items: [
        { title: "Agendas una llamada", desc: "Reserva 30 minutos con nuestro equipo para contarnos sobre tu negocio." },
        { title: "Nosotros construimos", desc: "Diseñamos, desarrollamos y publicamos tu sitio profesional en menos de 15 días hábiles." },
        { title: "Tú creces online", desc: "Recibes clientes desde el día 1 — tu sitio trabaja por ti las 24 horas." },
      ],
    },
    why: {
      h2a: "Lo que nos hace",
      p: "Sabemos lo que necesita un negocio latino en USA: presencia profesional, en ambos idiomas, sin pagar precios de agencia corporativa.",
      check1: "Sin contratos de permanencia a largo plazo.",
      check2: "Propiedad total de tu dominio y contenido.",
      cta: "Agenda tu llamada gratis",
    },
    benefits: [
      { title: "Bilingüe por defecto",    desc: "Español e inglés desde el inicio." },
      { title: "Contenido profesional",   desc: "Textos optimizados para atraer clientes a tu negocio." },
      { title: "Entrega en días, no meses", desc: "Rapidez sin sacrificar calidad." },
      { title: "Precios para latinos",    desc: "Precios para negocios latinos, no corporativos." },
    ],
    cta: {
      h2: "¿Listo para subir de nivel tu negocio en Estados Unidos?",
      p: "En 30 minutos analizamos tu negocio y te decimos exactamente qué plan necesitas. Sin compromiso, sin presión de ventas.",
      btn: "Agendar Llamada Gratuita",
    },
  },

  en: {
    nav: {
      services: "Services",
      howItWorks: "How It Works",
      plans: "Plans",
      cta: "Book a Call",
    },
    hero: {
      badge: "#1 Agency for Latino Businesses in the USA",
      h1a: "Your business online,",
      h1b: "without the hassle.",
      p: "We create professional websites for restaurants, salons, clinics and more. Bilingual, fast, and without corporate agency prices.",
      cta1: "Book a Call",
      cta2: "How does it work?",
      socialBold: "+50 businesses",
      social: "are already growing with us.",
    },
    calendar: {
      empty: "Create a calendar in the CRM",
      sub: "It will appear here automatically.",
    },
    trusted: {
      label: "Specialists in Service Industries",
      industries: ["RESTAURANTS", "BEAUTY SALONS", "CONSTRUCTION", "DENTAL CLINICS", "LEGAL SERVICES"],
    },
    plans: {
      badge: "Clear Pricing",
      h2: "Smart Investment for Your Business",
      p: "Select the plan that fits your current stage. Scale when you're ready.",
      recommended: "MOST RECOMMENDED",
      setupLabel: "Initial Setup",
      oneTime: "One-time payment",
      deliveryLabel: "Delivery time:",
      cta: "Book a Call",
    },
    steps: {
      badge: "Workflow",
      h2: "From zero to online in 3 steps",
      p: "We've optimized the process so you don't waste time.",
      items: [
        { title: "Book a call", desc: "Schedule 30 minutes with our team to tell us about your business." },
        { title: "We build it", desc: "Your professional, bilingual website." },
        { title: "You grow online", desc: "Ready to receive clients from day 1." },
      ],
    },
    why: {
      h2a: "Why choose",
      p: "We know what a Latino business in the USA needs: professional presence, in both languages, without paying corporate agency prices.",
      check1: "No long-term contracts.",
      check2: "Full ownership of your domain and content.",
      cta: "I want more information",
    },
    benefits: [
      { title: "Bilingual by default",       desc: "Spanish and English from the start." },
      { title: "Professional content",       desc: "Expert-written copy for your business." },
      { title: "Delivery in days, not months", desc: "Speed without sacrificing quality." },
      { title: "Prices for Latinos",         desc: "Pricing for Latino businesses, not corporations." },
    ],
    cta: {
      h2: "Ready to level up your business in the United States?",
      p: "Schedule a free 30-minute call with our team and we'll show you how.",
      btn: "Schedule a Free Call",
    },
  },
} as const;

export type Translations = typeof translations.es;
