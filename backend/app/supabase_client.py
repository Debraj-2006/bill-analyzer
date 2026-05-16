from supabase import create_client, Client
from app.core.config import settings

# Service-role client: bypasses RLS for server-side operations
# (inserting bills on behalf of users, etc.)
_supabase_service: Client | None = None

# Anon client: used for verifying user JWT tokens
_supabase_anon: Client | None = None


def get_supabase_service() -> Client:
    """Returns the service-role Supabase client (server-side use only)."""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
    return _supabase_service


def get_supabase_anon() -> Client:
    """Returns the anon Supabase client (used for auth token validation)."""
    global _supabase_anon
    if _supabase_anon is None:
        _supabase_anon = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
    return _supabase_anon
