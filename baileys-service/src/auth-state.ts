import { AuthenticationState, initAuthCreds, proto, BufferJSON } from "@whiskeysockets/baileys";
import { supabase } from "./supabase";

/**
 * Custom Baileys auth state that persists to Supabase (whatsapp_sessions.auth_state jsonb).
 * Replaces the default file-system-based useMultiFileAuthState.
 */
export async function useSupabaseAuthState(userId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  async function readData(): Promise<Record<string, any>> {
    const { data } = await supabase
      .from("whatsapp_sessions")
      .select("auth_state")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.auth_state as Record<string, any>) ?? {};
  }

  async function writeData(authState: Record<string, any>): Promise<void> {
    await supabase
      .from("whatsapp_sessions")
      .upsert({
        user_id:       userId,
        instance_name: userId,
        auth_state:    authState,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "user_id" });
  }

  const stored = await readData();

  const creds: AuthenticationState["creds"] = stored.creds
    ? JSON.parse(JSON.stringify(stored.creds), BufferJSON.reviver)
    : initAuthCreds();

  const keys: AuthenticationState["keys"] = {
    get: async (type, ids) => {
      const data: Record<string, any> = {};
      for (const id of ids) {
        const raw = stored[`${type}-${id}`];
        if (raw != null) {
          // proto keys need special handling
          let value = JSON.parse(JSON.stringify(raw), BufferJSON.reviver);
          if (type === "app-state-sync-key") {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          data[id] = value;
        }
      }
      return data;
    },
    set: async (data) => {
      for (const [type, items] of Object.entries(data)) {
        for (const [id, value] of Object.entries(items as Record<string, any>)) {
          const key = `${type}-${id}`;
          if (value != null) {
            stored[key] = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
          } else {
            delete stored[key];
          }
        }
      }
      await writeData(stored);
    },
  };

  return {
    state: { creds, keys },
    saveCreds: async () => {
      const updated = { ...stored, creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)) };
      await writeData(updated);
    },
  };
}
