import os
from supabase import create_client, Client, ClientOptions

def get_admin_client() -> Client | None:
    """Returns a Supabase client initialized with the service-role key (bypasses RLS)."""
    url = os.environ.get("SUPABASE_URL")
    # Some services might look for SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("[ERROR] SUPABASE_URL or SUPABASE_SERVICE_KEY not set in backend/.env")
        return None
    return create_client(url, key)

def get_anon_client() -> Client | None:
    """Returns a Supabase client initialized with the anonymous key."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        print("[WARNING] SUPABASE_URL or SUPABASE_ANON_KEY not set in backend/.env")
        return None
    return create_client(url, key)

def get_user_client(auth_header: str | None) -> Client | None:
    """
    Returns a Supabase client initialized with the anon key and scoped to the user
    by injecting the JWT token from the Authorization header.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        return None
        
    if auth_header and auth_header.lower().startswith("bearer "):
        # Inject the authorization header so requests are executed as the authenticated user
        options = ClientOptions(headers={"Authorization": auth_header})
        return create_client(url, key, options=options)
    
    # Fallback to anon client if no valid auth header
    return get_anon_client()
