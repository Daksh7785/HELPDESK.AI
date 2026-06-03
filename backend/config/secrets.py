import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_supabase_client = None

def get_vault_client() -> Client | None:
    """Lazily initialize and return the Supabase service role client."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
        
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        try:
            _supabase_client = create_client(url, key)
        except Exception as e:
            logger.warning(f"[Secrets] Failed to initialize Supabase client for Vault: {e}")
            _supabase_client = None
    return _supabase_client

def get_vault_secret(secret_name: str) -> str | None:
    """Fetch a decrypted secret from Supabase Vault via the secure get_vault_secret RPC."""
    client = get_vault_client()
    if not client:
        return None
    try:
        res = client.rpc("get_vault_secret", {"secret_name": secret_name}).execute()
        if res.data:
            return res.data
    except Exception as e:
        # Graceful warning to allow local/fallback mode without crashing startup
        logger.debug(f"[Secrets] Could not fetch secret '{secret_name}' from Vault (falling back): {e}")
    return None

def get_db_encryption_key() -> str | None:
    """Retrieve the DB encryption secret key from Vault with a fallback to env vars."""
    # Attempt to load from Vault first
    vault_secret = get_vault_secret("DB_ENCRYPTION_SECRET_KEY")
    if vault_secret:
        return vault_secret
        
    # Fallback to local environment variable
    return os.environ.get("DB_ENCRYPTION_SECRET_KEY")
