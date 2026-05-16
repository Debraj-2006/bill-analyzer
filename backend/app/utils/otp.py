"""
OTP Utility — generates, stores, sends, and verifies one-time passwords.

SMS Provider: Twilio
Dev Mode: If TWILIO_ACCOUNT_SID is empty, OTP is printed to the console only.
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional

from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException

from app.core.config import settings
from app.database import get_database


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def generate_otp(length: int = 6) -> str:
    """Return a random numeric OTP string."""
    return "".join(random.choices(string.digits, k=length))


def _normalize_mobile(mobile: str) -> str:
    """Strip country code prefix if present, return 10-digit number."""
    mobile = mobile.strip().replace(" ", "").replace("-", "")
    if mobile.startswith("+91"):
        mobile = mobile[3:]
    elif mobile.startswith("91") and len(mobile) == 12:
        mobile = mobile[2:]
    return mobile


# ---------------------------------------------------------------------------
# MongoDB OTP store
# ---------------------------------------------------------------------------

async def _ensure_ttl_index() -> None:
    """Create a TTL index on otp_store.expires_at (runs once per startup)."""
    db = get_database()
    await db["otp_store"].create_index(
        "expires_at",
        expireAfterSeconds=0,
        background=True,
    )


async def store_otp(mobile: str, otp: str, purpose: str) -> None:
    """Upsert OTP for given mobile + purpose into the otp_store collection."""
    db = get_database()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    await db["otp_store"].update_one(
        {"mobile_number": mobile, "purpose": purpose},
        {
            "$set": {
                "mobile_number": mobile,
                "otp": otp,
                "purpose": purpose,
                "created_at": datetime.utcnow(),
                "expires_at": expires_at,
            }
        },
        upsert=True,
    )


async def verify_otp(mobile: str, otp: str, purpose: str) -> bool:
    """
    Return True if the OTP matches and hasn't expired.
    Deletes the record on success.
    """
    db = get_database()
    record = await db["otp_store"].find_one(
        {"mobile_number": mobile, "purpose": purpose}
    )

    if not record:
        return False

    # Manual expiry guard (TTL index may lag by up to 60 s)
    if datetime.utcnow() > record["expires_at"]:
        await db["otp_store"].delete_one({"_id": record["_id"]})
        return False

    if record["otp"] != otp:
        return False

    # Valid — delete so it can't be reused
    await db["otp_store"].delete_one({"_id": record["_id"]})
    return True


# ---------------------------------------------------------------------------
# SMS Sending via Twilio
# ---------------------------------------------------------------------------

def send_otp_sms_sync(mobile: str, otp: str) -> bool:
    """
    Send OTP via Twilio (synchronous — runs in thread pool via asyncio).
    Falls back to console logging if credentials are not configured (dev mode).
    Returns True on success.
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        # ── DEV MODE ─────────────────────────────────────────────────────────
        print(f"\n{'='*50}")
        print(f"  [DEV MODE] OTP for +91{mobile}: {otp}")
        print(f"  (Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env to send real SMS)")
        print(f"{'='*50}\n")
        return True

    from_number = settings.TWILIO_FROM_NUMBER or "+14155238886"  # Twilio sandbox default
    to_number = f"+91{mobile}"
    body = f"Your WBSEDCL Bill Analyzer OTP is {otp}. Valid for {settings.OTP_EXPIRE_MINUTES} minutes. Do not share it with anyone."

    try:
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=body,
            from_=from_number,
            to=to_number,
        )
        print(f"[Twilio] Message SID: {message.sid} | Status: {message.status}")
        return message.status not in ("failed", "undelivered")
    except TwilioRestException as e:
        print(f"[Twilio ERROR] {e.code}: {e.msg}")
        return False
    except Exception as exc:
        print(f"[Twilio EXCEPTION] {exc}")
        return False


async def send_otp_sms(mobile: str, otp: str) -> bool:
    """Async wrapper — runs the synchronous Twilio call in a thread pool."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_otp_sms_sync, mobile, otp)


# ---------------------------------------------------------------------------
# High-level function
# ---------------------------------------------------------------------------

async def create_and_send_otp(mobile: str, purpose: str) -> tuple[str, bool]:
    """Generate OTP, persist it, send SMS. Returns (otp, sms_sent)."""
    mobile = _normalize_mobile(mobile)
    otp = generate_otp()
    await store_otp(mobile, otp, purpose)
    sms_sent = await send_otp_sms(mobile, otp)
    return otp, sms_sent
