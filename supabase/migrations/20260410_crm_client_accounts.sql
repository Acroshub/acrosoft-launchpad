-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 1: crm_client_accounts + crm_saas_invitations
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── crm_client_accounts ───────────────────────────────────────────────────────
-- Links an Acrosoft admin contact to the SaaS client account they own.
-- One row per active SaaS client.
CREATE TABLE IF NOT EXISTS crm_client_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Admin who sold the SaaS subscription
  admin_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The contact record inside the admin's CRM
  contact_id      uuid NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,

  -- The Supabase Auth user created for the SaaS client
  client_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Client's email (snapshot — contact.email may change)
  client_email    text NOT NULL,

  -- Status lifecycle
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'disabled')),
  disabled_at     timestamptz,
  deleted_at      timestamptz,   -- soft delete after 6-month retention

  UNIQUE (admin_user_id, contact_id)
);

ALTER TABLE crm_client_accounts ENABLE ROW LEVEL SECURITY;

-- Admin can manage their own client accounts
CREATE POLICY "Admin manages own client accounts"
  ON crm_client_accounts
  USING  (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());


-- ─── crm_saas_invitations ──────────────────────────────────────────────────────
-- Stores the invitation token sent to a new SaaS client to set their password.
CREATE TABLE IF NOT EXISTS crm_saas_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  account_id      uuid NOT NULL REFERENCES crm_client_accounts(id) ON DELETE CASCADE,
  token           text NOT NULL UNIQUE,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at         timestamptz
);

ALTER TABLE crm_saas_invitations ENABLE ROW LEVEL SECURITY;

-- Only the admin who owns the account can see/create invitations
CREATE POLICY "Admin manages own invitations"
  ON crm_saas_invitations
  USING (
    EXISTS (
      SELECT 1 FROM crm_client_accounts ca
      WHERE ca.id = crm_saas_invitations.account_id
        AND ca.admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_client_accounts ca
      WHERE ca.id = crm_saas_invitations.account_id
        AND ca.admin_user_id = auth.uid()
    )
  );
