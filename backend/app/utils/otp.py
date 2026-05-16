"""
OTP Utility — generates, stores, sends, and verifies one-time passwords.

Email Provider: Gmail SMTP (free, no IP restrictions)
Debug Mode: If GMAIL_USER is "your-gmail@gmail.com" or "debug", OTP is printed to the console only.
"""

import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings
from app.database import get_database


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def generate_otp(length: int = 6) -> str:
    """Return a random numeric OTP string."""
    return "".join(random.choices(string.digits, k=length))


def _normalize_email(email: str) -> str:
    """Lowercase and strip whitespace from email."""
    return email.strip().lower()


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


async def store_otp(identifier: str, otp: str, purpose: str) -> None:
    """Upsert OTP for given identifier (email) + purpose into otp_store."""
    db = get_database()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    await db["otp_store"].update_one(
        {"identifier": identifier, "purpose": purpose},
        {
            "$set": {
                "identifier": identifier,
                "otp": otp,
                "purpose": purpose,
                "created_at": datetime.utcnow(),
                "expires_at": expires_at,
            }
        },
        upsert=True,
    )


async def verify_otp(identifier: str, otp: str, purpose: str) -> bool:
    """
    Return True if the OTP matches and hasn't expired.
    Deletes the record on success.
    """
    db = get_database()
    record = await db["otp_store"].find_one(
        {"identifier": identifier, "purpose": purpose}
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
# Email Sending via Gmail SMTP
# ---------------------------------------------------------------------------

def _build_email_html(otp: str) -> str:
    """Build a styled HTML email body for the OTP."""
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0"
                   style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:16px;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">⚡ WBSEDCL Bill Analyzer</h1>
                  <p style="margin:6px 0 0;color:#c4b5fd;font-size:14px;">Email Verification</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px 36px;text-align:center;">
                  <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">
                    Use this one-time password to verify your email address.
                  </p>
                  <!-- OTP Box -->
                  <div style="background:#1e293b;border:2px solid #4f46e5;border-radius:12px;
                              display:inline-block;padding:20px 40px;margin-bottom:28px;">
                    <span style="font-size:40px;font-weight:800;letter-spacing:12px;
                                 color:#a5b4fc;font-family:'Courier New',monospace;">{otp}</span>
                  </div>
                  <p style="color:#64748b;font-size:13px;margin:0;">
                    This OTP expires in <strong style="color:#94a3b8;">{settings.OTP_EXPIRE_MINUTES} minutes</strong>.<br/>
                    If you didn't request this, please ignore this email.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:20px 36px;border-top:1px solid #1e293b;text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">
                    WBSEDCL Bill Analyzer &mdash; Secure &amp; Free
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


async def send_otp_email(email: str, otp: str) -> bool:
    """
    Send OTP via Gmail SMTP.
    Falls back to console logging if credentials are placeholders or "debug".
    """
    is_placeholder = settings.GMAIL_USER in ["your-gmail@gmail.com", "debug", ""]
    
    if is_placeholder:
        # ── DEBUG FALLBACK ──────────────────────────────────────────────────
        print(f"\n{'!'*60}")
        print(f"  [DEBUG MODE] EMAIL OTP FOR {email}: {otp}")
        print(f"  Copy this code and paste it into the website UI.")
        print(f"  (To send real emails, update GMAIL_USER in .env)")
        print(f"{'!'*60}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your OTP: {otp} — WBSEDCL Bill Analyzer"
        msg["From"] = f"WBSEDCL Bill Analyzer <{settings.GMAIL_USER}>"
        msg["To"] = email

        # Plain text fallback
        plain = f"Your WBSEDCL Bill Analyzer OTP is: {otp}\nValid for {settings.OTP_EXPIRE_MINUTES} minutes."
        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(_build_email_html(otp), "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.sendmail(settings.GMAIL_USER, email, msg.as_string())

        print(f"[Email OTP] Sent to {email} ✓")
        return True

    except smtplib.SMTPAuthenticationError:
        print(f"\n[!] GMAIL AUTHENTICATION FAILED for user: {settings.GMAIL_USER}")
        print("[!] Make sure you are using an 'App Password', not your regular Gmail password.\n")
        return False
    except Exception as exc:
        print(f"[Email OTP EXCEPTION] {exc}")
        return False


# ---------------------------------------------------------------------------
# High-level function
# ---------------------------------------------------------------------------

async def create_and_send_otp(email: str, purpose: str) -> tuple[str, bool]:
    """Generate OTP, persist it, send email. Returns (otp, email_sent)."""
    email = _normalize_email(email)
    otp = generate_otp()
    await store_otp(email, otp, purpose)
    email_sent = await send_otp_email(email, otp)
    return otp, email_sent
