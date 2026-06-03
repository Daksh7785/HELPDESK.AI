-- Secure helper function to access decrypted secrets from Supabase Vault.
-- This function is restricted to execution by the service_role and database administrator only.

CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Restrict access to service_role and postgres (superuser)
  IF auth.role() != 'service_role' AND session_user != 'postgres' THEN
    RAISE EXCEPTION 'Unauthorized: Access restricted to service_role or database administrators.';
  END IF;

  RETURN (
    SELECT decrypted_secret 
    FROM vault.decrypted_secrets 
    WHERE name = secret_name 
    LIMIT 1
  );
END;
$$;

-- Revoke execute from public to make sure it cannot be run by anonymous users
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM public;

-- Grant execute to postgres and service_role
GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO service_role;
