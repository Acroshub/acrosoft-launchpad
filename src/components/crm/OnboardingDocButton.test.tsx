import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmContact } from "@/lib/supabase";
import { ONBOARDING_FORM_ID } from "@/lib/onboardingDoc";
import OnboardingDocButton from "./OnboardingDocButton";

let access: { status: string; expires_at: string | null } | null = null;
vi.mock("@/hooks/useCrmData", () => ({ useSaasAccess: () => ({ data: access }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const contact = (filled: boolean) => ({
  id: "c1", user_id: "u1", name: "Cliente", phone: null,
  custom_fields: filled ? { [ONBOARDING_FORM_ID]: { "ob-name": "Negocio" } } : null,
}) as unknown as CrmContact;

const renderWith = (filled: boolean) => render(<OnboardingDocButton contact={contact(filled)} contacts={[contact(filled)]} />);
const button = () => screen.queryByRole("button", { name: /Onboarding para Google Ads/ });

afterEach(() => { cleanup(); access = null; });

describe("OnboardingDocButton", () => {
  it("aparece con Acceso SaaS activo y el formulario llenado, sin necesidad de cita", () => {
    access = { status: "active", expires_at: null };
    renderWith(true);
    expect(button()).toBeTruthy();
  });

  it("no aparece si falta el Acceso SaaS, está suspendido o falta el formulario", () => {
    renderWith(true);
    expect(button()).toBeNull();
    cleanup();
    access = { status: "suspended", expires_at: null };
    renderWith(true);
    expect(button()).toBeNull();
    cleanup();
    access = { status: "active", expires_at: null };
    renderWith(false);
    expect(button()).toBeNull();
  });
});
