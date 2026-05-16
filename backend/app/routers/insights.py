# app/routers/insights.py — Adaptive bill insight API endpoints

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app.database import get_database
from app.core.security import settings
from app.models.insight_model import (
    ApplianceProfileCreate, TipFeedbackCreate, InsightsResponse
)
from app.utils.insight_engine import (
    APPLIANCE_DB,
    compute_theoretical_consumption,
    compute_category_breakdown,
    generate_tips,
)
from bson import ObjectId
from datetime import datetime
import jwt

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


async def get_current_user_email(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


# ── Appliance DB reference (for the frontend setup UI) ───────────────────────

@router.get("/appliances/catalogue")
async def get_appliance_catalogue():
    """Return the full appliance database so the frontend can build the setup UI."""
    catalogue = {}
    for key, val in APPLIANCE_DB.items():
        cat = val["category"]
        if cat not in catalogue:
            catalogue[cat] = []
        catalogue[cat].append({
            "id": key,
            "label": val["label"],
            "watts": val["watts"],
            "category": cat,
        })
    return catalogue


# ── User Appliance Profile ────────────────────────────────────────────────────

@router.get("/appliances")
async def get_appliance_profile(email: str = Depends(get_current_user_email)):
    """Fetch the user's saved appliance profile."""
    db = get_database()
    profile = await db["appliance_profiles"].find_one({"user_email": email})
    if not profile:
        return {"has_profile": False, "appliances": [], "family_members": 4, "home_type": "apartment"}
    profile["_id"] = str(profile["_id"])
    profile["has_profile"] = True
    return profile


@router.post("/appliances")
async def save_appliance_profile(
    profile: ApplianceProfileCreate,
    email: str = Depends(get_current_user_email),
):
    """Create or update the user's appliance profile."""
    db = get_database()
    now = datetime.utcnow()
    doc = {
        "user_email": email,
        "appliances": [a.model_dump() for a in profile.appliances],
        "family_members": profile.family_members,
        "home_type": profile.home_type,
        "updated_at": now,
    }
    existing = await db["appliance_profiles"].find_one({"user_email": email})
    if existing:
        await db["appliance_profiles"].update_one(
            {"user_email": email},
            {"$set": doc}
        )
        doc["created_at"] = existing.get("created_at", now)
    else:
        doc["created_at"] = now
        await db["appliance_profiles"].insert_one(doc)

    return {"message": "Profile saved successfully", "has_profile": True}


# ── Tip Generation ────────────────────────────────────────────────────────────

@router.get("/tips/{bill_id}", response_model=InsightsResponse)
async def get_tips_for_bill(
    bill_id: str,
    email: str = Depends(get_current_user_email),
):
    """
    Generate ranked, personalized tips for a specific bill.
    Uses the user's appliance profile + their feedback history to rank tips.
    """
    db = get_database()

    # Load the bill
    try:
        bill = await db["bills"].find_one({"_id": ObjectId(bill_id), "user_email": email})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid bill ID")
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    actual_units = bill.get("units_consumed") or 0
    has_error = bill.get("has_error", False)
    is_estimated = bill.get("is_estimated", False)

    # Load appliance profile
    profile_doc = await db["appliance_profiles"].find_one({"user_email": email})
    has_profile = profile_doc is not None

    if not has_profile or not profile_doc.get("appliances"):
        # No profile — return basic tips without model analysis
        from app.models.insight_model import GeneratedTip
        basic_tips = generate_tips(
            appliances=[],
            actual_units=actual_units,
            breakdown={"__total__": 0},
            feedback_history=[],
            has_error=has_error,
            is_estimated=is_estimated,
        )
        return InsightsResponse(
            tips=basic_tips,
            theoretical_total_units=0,
            actual_units=actual_units,
            gap_units=0,
            gap_pct=0,
            consumption_breakdown={},
            has_profile=False,
        )

    # Reconstruct ApplianceInput objects
    from app.models.insight_model import ApplianceInput
    appliances = [ApplianceInput(**a) for a in profile_doc.get("appliances", [])]

    # Compute theoretical consumption
    breakdown = compute_theoretical_consumption(appliances)
    theoretical_total = breakdown.get("__total__", 0)

    # Category breakdown for chart
    cat_breakdown = compute_category_breakdown(appliances, breakdown)

    # Load feedback history for this user
    feedback_history = await db["tip_feedback"].find({"user_email": email}).to_list(500)

    # Generate tips
    tips = generate_tips(
        appliances=appliances,
        actual_units=actual_units,
        breakdown=breakdown,
        feedback_history=feedback_history,
        has_error=has_error,
        is_estimated=is_estimated,
    )

    gap = actual_units - theoretical_total
    gap_pct = round((gap / max(actual_units, 1)) * 100, 1)

    return InsightsResponse(
        tips=tips,
        theoretical_total_units=round(theoretical_total, 1),
        actual_units=actual_units,
        gap_units=round(gap, 1),
        gap_pct=gap_pct,
        consumption_breakdown=cat_breakdown,
        has_profile=True,
    )


# ── Tip Feedback ──────────────────────────────────────────────────────────────

@router.post("/feedback")
async def submit_tip_feedback(
    feedback: TipFeedbackCreate,
    email: str = Depends(get_current_user_email),
):
    """Submit feedback on a tip (helpful / not_helpful / already_doing)."""
    db = get_database()
    doc = {
        "user_email": email,
        "tip_id": feedback.tip_id,
        "bill_id": feedback.bill_id,
        "rating": feedback.rating,
        "created_at": datetime.utcnow(),
    }
    # Upsert — one feedback per user per tip per bill
    await db["tip_feedback"].update_one(
        {"user_email": email, "tip_id": feedback.tip_id, "bill_id": feedback.bill_id},
        {"$set": doc},
        upsert=True,
    )
    return {"message": "Feedback recorded"}


# ── Consumption History ───────────────────────────────────────────────────────

@router.get("/history")
async def get_consumption_history(email: str = Depends(get_current_user_email)):
    """Return month-over-month consumption trend for the user's bills."""
    db = get_database()
    bills = await db["bills"].find(
        {"user_email": email, "units_consumed": {"$exists": True}},
        {"bill_month": 1, "units_consumed": 1, "total_amount": 1, "expected_amount": 1, "has_error": 1}
    ).sort("created_at", 1).to_list(24)

    return [
        {
            "bill_month": b.get("bill_month", "Unknown"),
            "units_consumed": b.get("units_consumed"),
            "total_amount": b.get("total_amount"),
            "expected_amount": b.get("expected_amount"),
            "has_error": b.get("has_error", False),
        }
        for b in bills
    ]
