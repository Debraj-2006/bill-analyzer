# app/models/insight_model.py — Pydantic models for the adaptive insight engine

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


class ApplianceInput(BaseModel):
    """A single appliance in the user's home."""
    appliance_id: str                     # key from APPLIANCE_DB, e.g. "ac_1.5ton_3star"
    quantity: int = 1                     # how many of this appliance
    hours_per_day: float                  # average hours used per day
    months_active: int = 12              # how many months per year (e.g. AC = 5)


class ApplianceProfileCreate(BaseModel):
    """Payload to save a user's home appliance profile."""
    appliances: List[ApplianceInput]
    family_members: int = 4
    home_type: Literal["apartment", "house", "villa"] = "apartment"


class ApplianceProfileResponse(ApplianceProfileCreate):
    """Stored appliance profile with metadata."""
    user_email: str
    created_at: datetime
    updated_at: datetime


class TipFeedbackCreate(BaseModel):
    """User feedback on a single tip."""
    tip_id: str
    bill_id: str
    rating: Literal["helpful", "not_helpful", "already_doing"]


class GeneratedTip(BaseModel):
    """A single actionable tip returned by the insight engine."""
    id: str
    category: str                        # "ac", "geyser", "phantom", "solar", etc.
    color: str                           # UI color token
    priority_label: str                  # "High Impact", "Quick Win", etc.
    title: str
    short_desc: str
    detail: str
    actions: List[str]
    estimated_savings_units: float       # kWh saved per month if tip followed
    estimated_savings_rupees: float      # ₹ saved per month
    priority_score: float                # higher = shown first


class InsightsResponse(BaseModel):
    """Full response for the tips endpoint."""
    tips: List[GeneratedTip]
    theoretical_total_units: float       # what the model thinks you should be consuming
    actual_units: float                  # what your bill says
    gap_units: float                     # actual - theoretical (positive = unexplained usage)
    gap_pct: float                       # percentage overage
    consumption_breakdown: dict          # {"ac": 45.2, "geyser": 22.1, ...} — share %
    has_profile: bool
