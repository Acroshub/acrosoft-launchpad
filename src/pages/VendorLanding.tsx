import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useLandingProfile, useLandingServices } from "@/hooks/useCrmData";
import LandingContent from "@/components/shared/LandingContent";

interface VendorPublicData {
  name: string;
  slug: string;
  landing_calendar_id: string | null;
}

const VendorLanding = () => {
  const { vendorSlug } = useParams<{ vendorSlug: string }>();
  const navigate = useNavigate();

  const [vendor, setVendor]     = useState<VendorPublicData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading]   = useState(true);

  const { data: adminProfile }  = useLandingProfile();
  const { data: services = [] } = useLandingServices();

  useEffect(() => {
    if (!vendorSlug) { navigate("/", { replace: true }); return; }

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    fetch(`${SUPABASE_URL}/functions/v1/vendor-landing-data?slug=${encodeURIComponent(vendorSlug)}`, {
      headers: { "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        const data = await res.json();
        if (!data) { setNotFound(true); return; }
        setVendor(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [vendorSlug, navigate]);

  useEffect(() => {
    if (notFound) navigate("/", { replace: true });
  }, [notFound, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) return null;

  return <LandingContent calendarId={vendor.landing_calendar_id} services={services} />;
};

export default VendorLanding;
