import { useMultiFileAuthState } from "@whiskeysockets/baileys";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

const AUTH_DIR = process.env.AUTH_DIR ?? "/data/auth";

function getAuthPath(userId: string): string {
  return path.join(AUTH_DIR, userId);
}

/**
 * Per-user Baileys auth state backed by Baileys' built-in useMultiFileAuthState.
 * Each Signal Protocol key is written to its own file atomically, eliminating
 * the race conditions that corrupted sessions when we used a single Supabase
 * JSONB blob (root cause of the "Waiting for the message" delivery bug).
 *
 * Requires a persistent volume mounted at /data (configured in fly.toml).
 */
export async function useUserAuthState(userId: string) {
  const dir = getAuthPath(userId);
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
  return useMultiFileAuthState(dir);
}

export async function clearAuthState(userId: string): Promise<void> {
  const dir = getAuthPath(userId);
  if (existsSync(dir)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
