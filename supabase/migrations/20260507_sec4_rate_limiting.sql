-- ── SEC-4 · Rate Limiting ─────────────────────────────────────────────────────
-- One row per (function, IP) pair. Window resets atomically when it expires.
-- Used exclusively via check_rate_limit() — no direct table access needed.

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  key          text        PRIMARY KEY,
  count        integer     NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- No RLS: table is only accessible via SECURITY DEFINER function below.
-- Service-role edge functions call it through supabase.rpc().

-- ── Core rate-limit check (atomic, safe under concurrent load) ────────────────
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key            text,
  p_window_seconds integer,
  p_max_count      integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count        integer;
  v_window_start timestamptz;
BEGIN
  -- Lock the row to prevent race conditions between concurrent requests
  SELECT count, window_start
    INTO v_count, v_window_start
    FROM rate_limit_hits
   WHERE key = p_key
     FOR UPDATE;

  IF NOT FOUND THEN
    -- First hit ever for this key
    INSERT INTO rate_limit_hits (key, count, window_start)
    VALUES (p_key, 1, now());
    RETURN true;
  END IF;

  -- Window expired → reset
  IF v_window_start + (p_window_seconds * interval '1 second') < now() THEN
    UPDATE rate_limit_hits
       SET count = 1, window_start = now()
     WHERE key = p_key;
    RETURN true;
  END IF;

  -- Within window and already at limit → block
  IF v_count >= p_max_count THEN
    RETURN false;
  END IF;

  -- Within window and under limit → increment
  UPDATE rate_limit_hits
     SET count = count + 1
   WHERE key = p_key;
  RETURN true;
END;
$$;

-- ── Housekeeping: prune stale rows (called periodically or on demand) ─────────
CREATE OR REPLACE FUNCTION cleanup_rate_limit_hits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limit_hits
   WHERE window_start < now() - interval '2 hours';
$$;
