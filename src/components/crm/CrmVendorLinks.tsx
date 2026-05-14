import { Copy, ExternalLink, Link } from "lucide-react";
import { toast } from "sonner";
import { useVendorLinks } from "@/hooks/useCrmData";
import type { CrmVendor } from "@/lib/supabase";

interface Props {
  vendorProfile: CrmVendor;
}

const CrmVendorLinks = ({ vendorProfile }: Props) => {
  const { data: links, isLoading } = useVendorLinks();

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const buildOnboardingUrl = (base: string) => {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}ref=${vendorProfile.slug}`;
  };

  if (isLoading) return null;

  if (!links?.payment_link && !links?.onboarding_link) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Links</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Links compartidos por el administrador</p>
        </div>
        <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground text-sm">
          El administrador aún no ha configurado los links.
        </div>
      </div>
    );
  }

  const linkItems = [
    links?.payment_link
      ? { title: links.payment_link_title || "Link de Pago", url: links.payment_link }
      : null,
    links?.onboarding_link
      ? {
          title: links.onboarding_link_title || "Link de Onboarding",
          url: buildOnboardingUrl(links.onboarding_link),
        }
      : null,
  ].filter(Boolean) as { title: string; url: string }[];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Links</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Comparte estos links con tus clientes
        </p>
      </div>

      <div className="space-y-3">
        {linkItems.map((item) => (
          <div key={item.url} className="bg-card border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Link size={14} className="text-muted-foreground shrink-0" />
              <p className="text-sm font-semibold">{item.title}</p>
            </div>
            <div className="flex items-center gap-2 bg-secondary/40 border rounded-xl px-4 py-3">
              <p className="text-sm text-muted-foreground truncate flex-1 font-mono text-xs">
                {item.url}
              </p>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => copyLink(item.url)}
                  className="flex items-center gap-1.5 text-[11px] font-medium border rounded-lg px-3 py-1.5 bg-background hover:bg-secondary transition-all"
                >
                  <Copy size={11} /> Copiar
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-medium border rounded-lg px-3 py-1.5 bg-background hover:bg-secondary transition-all"
                >
                  <ExternalLink size={11} /> Abrir
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        El link de onboarding incluye tu identificador <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">?ref={vendorProfile.slug}</span> para que las ventas se registren a tu nombre.
      </p>
    </div>
  );
};

export default CrmVendorLinks;
