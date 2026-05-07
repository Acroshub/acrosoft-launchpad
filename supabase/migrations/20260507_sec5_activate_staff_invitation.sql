-- ── SEC-5 · activate_staff_invitation() ──────────────────────────────────────
-- Called from /crm-setup when account_type = "staff".
-- Reads staff_id + owner_user_id from the calling user's JWT metadata,
-- then links auth.uid() to the crm_staff row and marks it active.
-- SECURITY DEFINER: bypasses RLS so the newly-invited user (who has no profile
-- yet) can update their own staff row owned by someone else.

CREATE OR REPLACE FUNCTION activate_staff_invitation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id   uuid;
  v_owner_id   uuid;
  v_rows       int;
BEGIN
  -- Pull staff_id and owner_user_id from the JWT user_metadata
  BEGIN
    v_staff_id := (auth.jwt() -> 'user_metadata' ->> 'staff_id')::uuid;
    v_owner_id := (auth.jwt() -> 'user_metadata' ->> 'owner_user_id')::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Missing or invalid staff metadata in token';
  END;

  IF v_staff_id IS NULL OR v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Missing staff_id or owner_user_id in token metadata';
  END IF;

  -- Link the auth user and activate the staff row.
  -- Condition: must belong to the right owner AND still be in 'invited' status
  -- (prevents re-activation after the row is already active/disabled).
  UPDATE crm_staff
     SET staff_user_id = auth.uid(),
         status        = 'active'
   WHERE id             = v_staff_id
     AND owner_user_id  = v_owner_id
     AND status         = 'invited';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Staff record not found, wrong owner, or already activated';
  END IF;
END;
$$;

-- Grant execution to authenticated users only
GRANT EXECUTE ON FUNCTION activate_staff_invitation() TO authenticated;
