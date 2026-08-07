import { useState, useEffect } from "react";
import { CreditCard, Construction, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { useStripeConnectionStatus, useSaveStripeKeys, useDisconnectStripe } from "@/hooks/useCrmData";

const DevBanner = () => (
  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
    <Construction size={16} className="text-amber-600 shrink-0" />
    <div>
      <p className="text-xs font-semibold text-amber-800">Sección en desarrollo</p>
      <p className="text-[11px] text-amber-700/80 mt-0.5">
        Solo tú (admin) la ves por ahora. Ya puedes conectar tu cuenta — el checkout público y el cobro automático de renovaciones se agregan en las siguientes iteraciones.
      </p>
    </div>
  </div>
);

const CrmStripe = () => {
  const { data: status, isLoading } = useStripeConnectionStatus();
  const saveKeys = useSaveStripeKeys();
  const disconnect = useDisconnectStripe();

  const [mode, setMode] = useState<"test" | "live">("test");
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  useEffect(() => {
    if (status?.mode) setMode(status.mode);
    if (status?.publishable_key) setPublishableKey(status.publishable_key);
  }, [status?.mode, status?.publishable_key]);

  const handleSave = async () => {
    if (!secretKey.trim()) {
      toast.error("Ingresa tu Secret Key");
      return;
    }
    try {
      await saveKeys.mutateAsync({ mode, secret_key: secretKey.trim(), publishable_key: publishableKey.trim() || undefined });
      setSecretKey("");
      toast.success("Stripe conectado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al conectar con Stripe");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success("Stripe desconectado");
    } catch {
      toast.error("Error al desconectar");
    } finally {
      setDisconnectOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <DeleteConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        onConfirm={handleDisconnect}
        isPending={disconnect.isPending}
        description="Se borrará la Secret Key guardada. Los servicios/productos marcados para venderse por Stripe dejarán de poder cobrarse hasta que vuelvas a conectar."
      />

      <DevBanner />

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <CreditCard size={19} className="text-primary/70" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Stripe</h1>
          <p className="text-xs text-muted-foreground">Conecta tu cuenta para cobrar con tarjeta</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Estado de conexión */}
          <div className="bg-card border rounded-2xl p-5 space-y-3 h-fit">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Estado</p>
            {status?.connected ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-foreground">Conectado</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    status.mode === "live"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {status.mode === "live" ? "Modo real" : "Modo prueba"}
                  </span>
                </div>
                {status.account_email && (
                  <p className="text-xs text-muted-foreground">Cuenta: {status.account_email}</p>
                )}
                {status.last_verified_at && (
                  <p className="text-[11px] text-muted-foreground/70">
                    Verificado: {new Date(status.last_verified_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive mt-1" onClick={() => setDisconnectOpen(true)}>
                  Desconectar
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="text-sm text-muted-foreground">Sin conectar</span>
              </div>
            )}
            <div className="flex items-start gap-2 pt-2 border-t">
              <ShieldCheck size={13} className="text-muted-foreground/60 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                Tu Secret Key se guarda de forma segura — nunca es legible desde el navegador ni se muestra de vuelta aquí.
              </p>
            </div>
          </div>

          {/* Formulario de conexión */}
          <div className="bg-card border rounded-2xl p-5 space-y-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {status?.connected ? "Actualizar credenciales" : "Conectar cuenta"}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Modo</label>
              <div className="flex gap-2">
                {(["test", "live"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 h-9 rounded-xl text-xs font-semibold border transition-colors ${
                      mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {m === "test" ? "Prueba" : "Real"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Secret Key ({mode === "test" ? "sk_test_..." : "sk_live_..."})
              </label>
              <Input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={mode === "test" ? "sk_test_..." : "sk_live_..."}
                className="h-9 text-base md:text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Publishable Key (opcional por ahora)</label>
              <Input
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder={mode === "test" ? "pk_test_..." : "pk_live_..."}
                className="h-9 text-base md:text-sm font-mono"
              />
            </div>

            <Button onClick={handleSave} disabled={saveKeys.isPending} className="w-full h-9 text-sm gap-2">
              {saveKeys.isPending && <Loader2 size={14} className="animate-spin" />}
              {status?.connected ? "Actualizar conexión" : "Conectar Stripe"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmStripe;
