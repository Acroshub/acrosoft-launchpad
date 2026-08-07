import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useAuth";
import AcrosSoftwareLanding from "@/components/shared/AcrosSoftwareLanding";

const Index = () => {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user?.user_metadata?.account_type === "saas_client") {
      navigate("/crm", { replace: true });
    }
  }, [user, loading, navigate]);

  return <AcrosSoftwareLanding />;
};

export default Index;
