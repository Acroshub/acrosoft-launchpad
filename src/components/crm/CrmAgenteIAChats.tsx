import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Bot, User, Loader2, Phone, UserCog, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { AiConversation, AiMessage } from "@/lib/supabase";

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es", { day: "2-digit", month: "short" });
};

const CrmAgenteIAChats = () => {
  const { user } = useCurrentUser();
  const [convs, setConvs]                     = useState<AiConversation[]>([]);
  const [activeConvId, setActiveConvId]       = useState<string | null>(null);
  const [messages, setMessages]               = useState<AiMessage[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [draft, setDraft]                     = useState("");
  const [sending, setSending]                 = useState(false);
  const [mobileShowChat, setMobileShowChat]   = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeConv = useMemo(
    () => convs.find((c) => c.id === activeConvId) ?? null,
    [convs, activeConvId],
  );

  // ── Carga inicial + realtime de conversaciones ──────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      const list = (data ?? []) as AiConversation[];
      setConvs(list);
      if (!activeConvId && list.length > 0) setActiveConvId(list[0].id);
      setLoading(false);
    })();

    const channel = supabase
      .channel("ai-convs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_conversations", filter: `user_id=eq.${user.id}` },
        async () => {
          const { data } = await supabase
            .from("ai_conversations")
            .select("*")
            .eq("user_id", user.id)
            .order("last_message_at", { ascending: false })
            .limit(100);
          setConvs((data ?? []) as AiConversation[]);
        },
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── Carga + realtime de mensajes para la conversación activa ────────────
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages((data ?? []) as AiMessage[]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    })();

    const channel = supabase
      .channel(`ai-msgs-${activeConvId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_messages", filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as AiMessage]);
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
          });
        },
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [activeConvId]);

  const toggleMode = async (newMode: "ai" | "human") => {
    if (!activeConv) return;
    const { error } = await supabase
      .from("ai_conversations")
      .update({ mode: newMode })
      .eq("id", activeConv.id);
    if (error) { toast.error(error.message); return; }
    setConvs((prev) => prev.map((c) => c.id === activeConv.id ? { ...c, mode: newMode } : c));
    toast.success(newMode === "ai" ? "IA reanudada" : "Tomaste el control");
  };

  const sendManual = async () => {
    if (!activeConv || !draft.trim() || sending) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent-send`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${token}`,
            "apikey":        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ conversation_id: activeConv.id, text: draft.trim() }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }
      setDraft("");
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (convs.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center">
          <Bot size={22} className="text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold">Aún no hay conversaciones</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Cuando alguien escriba a tu WhatsApp, la conversación aparecerá aquí. Configura primero el prompt del agente en el tab "Configurar IA".
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl overflow-hidden h-[calc(100vh-220px)] min-h-[480px] flex">
      {/* Lista de conversaciones */}
      <aside className={`w-full lg:w-72 border-r flex flex-col ${mobileShowChat ? "hidden lg:flex" : "flex"}`}>
        <div className="px-4 py-3 border-b">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Conversaciones
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.map((c) => {
            const active = c.id === activeConvId;
            return (
              <button
                key={c.id}
                onClick={() => { setActiveConvId(c.id); setMobileShowChat(true); }}
                className={`w-full px-4 py-3 flex items-start gap-3 border-b text-left transition-colors ${
                  active ? "bg-secondary" : "hover:bg-secondary/60"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {(c.contact_name || c.phone).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {c.contact_name || `+${c.phone}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">+{c.phone}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      c.mode === "ai"
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    }`}>
                      {c.mode === "ai" ? "IA" : "Humano"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Panel de chat */}
      <section className={`flex-1 flex flex-col min-w-0 ${mobileShowChat ? "flex" : "hidden lg:flex"}`}>
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Selecciona una conversación
          </div>
        ) : (
          <>
            <header className="px-5 py-3.5 border-b flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="lg:hidden p-1 -ml-1 rounded-md hover:bg-secondary"
                >
                  <ChevronRight size={16} className="rotate-180" />
                </button>
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                  {(activeConv.contact_name || activeConv.phone).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {activeConv.contact_name || `Contacto +${activeConv.phone}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Phone size={10} /> +{activeConv.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  {activeConv.mode === "ai" ? "IA respondiendo" : "Modo humano"}
                </span>
                <Switch
                  checked={activeConv.mode === "ai"}
                  onCheckedChange={(v) => toggleMode(v ? "ai" : "human")}
                />
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-secondary/30">
              {messages.map((m) => {
                const fromBot = m.role !== "user";
                return (
                  <div key={m.id} className={`flex ${fromBot ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-card border"
                        : m.role === "assistant"
                          ? "bg-primary text-primary-foreground"
                          : "bg-amber-500 text-white"
                    }`}>
                      <div className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1">
                        {m.role === "user" ? <User size={9} /> : m.role === "assistant" ? <Bot size={9} /> : <UserCog size={9} />}
                        {m.role === "user" ? "Cliente" : m.role === "assistant" ? "IA" : "Tú"}
                        <span>· {new Date(m.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-8">Sin mensajes todavía</p>
              )}
            </div>

            <footer className="border-t p-3 bg-card">
              {activeConv.mode === "ai" ? (
                <div className="text-[11px] text-center text-muted-foreground py-2">
                  La IA está respondiendo en automático. Activa el modo humano para escribir tú.
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendManual();
                      }
                    }}
                    placeholder="Escribe tu respuesta…"
                    className="min-h-[40px] max-h-[120px] text-sm resize-none"
                  />
                  <Button
                    size="icon"
                    onClick={sendManual}
                    disabled={sending || !draft.trim()}
                    className="h-10 w-10 shrink-0"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </Button>
                </div>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
};

export default CrmAgenteIAChats;
