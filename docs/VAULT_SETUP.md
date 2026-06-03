# Supabase Vault Setup & Credential Rotation

This document describes how to configure sensitive environment variables and keys securely in the Supabase Vault and perform credential rotation without redeploying code.

## Stored Secrets

We use the Supabase Vault (`vault.secrets`) to store:
1. `SUPABASE_SERVICE_ROLE_KEY`: Used by database triggers and pg_cron to authorize requests to Supabase Edge Functions.
2. `DB_ENCRYPTION_SECRET_KEY`: Used by the Python backend to encrypt/decrypt PII fields in the database transparently.

---

## 1. Setting Up Secrets in Vault

Secrets can be managed via the Supabase Dashboard UI or using SQL commands.

### Option A: Using the Supabase Dashboard UI
1. Go to your project settings page on the Supabase Dashboard.
2. Navigate to **Vault** (or Vault / Decrypted Secrets).
3. Click **Add Secret**.
4. Configure the following:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Secret**: *[Insert your service_role key JWT]*
5. Click **Add Secret** again to add the second secret:
   - **Name**: `DB_ENCRYPTION_SECRET_KEY`
   - **Secret**: *[Insert your 32-byte encryption secret key]*

### Option B: Using SQL Commands
Execute the following SQL statements in the Supabase SQL Editor:

```sql
-- Store/Update Service Role Key
INSERT INTO vault.secrets (name, description, secret)
VALUES (
  'SUPABASE_SERVICE_ROLE_KEY', 
  'Internal key for triggering edge functions from Postgres', 
  'your-service-role-key-here'
)
ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- Store/Update DB Encryption Secret Key
INSERT INTO vault.secrets (name, description, secret)
VALUES (
  'DB_ENCRYPTION_SECRET_KEY', 
  'Secret key for transparent database PII encryption', 
  'your-db-encryption-secret-key-here'
)
ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
```

---

## 2. Dynamic Secret Fetching

### Database Triggers & Cron Jobs
The database automatically accesses `vault.decrypted_secrets` at runtime:
```sql
SELECT decrypted_secret 
FROM vault.decrypted_secrets 
WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' 
LIMIT 1;
```

### Python Backend
The backend utilizes the `get_vault_secret` RPC function. It resolves `DB_ENCRYPTION_SECRET_KEY` dynamically during query time:
- It first calls the Supabase RPC `get_vault_secret` (restricted to execution only by `service_role`).
- If it cannot contact the database or if the secret is missing, it falls back to the local environment variable `DB_ENCRYPTION_SECRET_KEY` set in `backend/.env`.

---

## 3. Credential Rotation (No Code Changes Required)

When rotating any key (e.g., due to a security requirement or a leak):
1. **Update the secret in the Supabase Vault** (either via dashboard UI or SQL script).
2. The change is immediate.
3. Next time a database trigger/cron runs or a backend query is encrypted/decrypted, they will dynamically pick up the new secret from the database Vault instantly. No service restart or git commit is required!
