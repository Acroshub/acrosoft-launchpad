import { createContext, useContext, useState, ReactNode } from "react";

export type OnboardingData = {
  // Step 1: Business
  businessName: string;
  industry: string;
  city: string;
  yearsInOperation: string;
  description: string;
  history: string;

  // Step 2: Plan
  plan: string;

  // Step 3: Identity
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  typography: string;
  visualStyle: string;
  references: string[];
  logo: File | null;

  // Step 4: Services
  services: { name: string; description: string; price: string; featured: boolean }[];

  // Step 5: Audience
  idealClient: string;
  problem: string;
  differentiator: string;
  testimonials: { name: string; text: string }[];
  faqs: { question: string; answer: string }[];

  // Step 6: Content
  contentStrategy: string;

  // Step 7: Contact
  phone: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  domain: string;
};

const defaultData: OnboardingData = {
  businessName: "",
  industry: "",
  city: "",
  yearsInOperation: "",
  description: "",
  history: "",
  plan: "",
  primaryColor: "#2563EB",
  secondaryColor: "#1E40AF",
  accentColor: "#F59E0B",
  typography: "",
  visualStyle: "",
  references: ["", "", ""],
  logo: null,
  services: [{ name: "", description: "", price: "", featured: false }],
  idealClient: "",
  problem: "",
  differentiator: "",
  testimonials: [{ name: "", text: "" }],
  faqs: [{ question: "", answer: "" }],
  contentStrategy: "",
  phone: "",
  email: "",
  address: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  domain: "",
};

type OnboardingContextType = {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<OnboardingData>(defaultData);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};
