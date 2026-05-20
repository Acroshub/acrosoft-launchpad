import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabasePublic } from "@/lib/supabase";
import { useLandingProfile, useLandingServices } from "@/hooks/useCrmData";
import { useCurrentUser } from "@/hooks/useAuth";
import LandingContent from "@/components/shared/LandingContent";

const useLandingCalendar = (profile: { user_id: string; landing_calendar_id: string | null } | null | undefined) =>
  useQuery({
    queryKey: ["landing_calendar", profile?.user_id],
    queryFn: async () => {
      if (!profile) return null;
      if (profile.landing_calendar_id) return profile.landing_calendar_id;
      const { data } = await supabasePublic
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

const Index = () => {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user?.user_metadata?.account_type === "saas_client") {
      navigate("/crm", { replace: true });
    }
  }, [user, loading, navigate]);

  const { data: adminProfile } = useLandingProfile();
  const { data: calendarId }   = useLandingCalendar(adminProfile);
  const { data: services = [] } = useLandingServices();

  return <LandingContent calendarId={calendarId} services={services} />;
};

export default Index;
