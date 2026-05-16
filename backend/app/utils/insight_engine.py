# app/utils/insight_engine.py — Core adaptive recommendation engine

from typing import List, Dict, Optional
from app.models.insight_model import ApplianceInput, GeneratedTip

# ─── Appliance Database ──────────────────────────────────────────────────────
# All wattages are in Watts (W). Monthly units = (watts × hours_per_day × 30) / 1000
APPLIANCE_DB: Dict[str, dict] = {
    # Cooling
    "ac_1ton_5star":    {"watts": 800,  "label": "1-ton 5★ Inverter AC",       "category": "cooling"},
    "ac_1ton_3star":    {"watts": 1000, "label": "1-ton 3★ Fixed AC",           "category": "cooling"},
    "ac_1.5ton_5star":  {"watts": 1000, "label": "1.5-ton 5★ Inverter AC",     "category": "cooling"},
    "ac_1.5ton_3star":  {"watts": 1350, "label": "1.5-ton 3★ Fixed AC",         "category": "cooling"},
    "ac_2ton_3star":    {"watts": 1800, "label": "2-ton 3★ AC",                 "category": "cooling"},
    "air_cooler":       {"watts": 200,  "label": "Air Cooler",                  "category": "cooling"},
    "ceiling_fan":      {"watts": 75,   "label": "Ceiling Fan",                 "category": "cooling"},
    "table_fan":        {"watts": 50,   "label": "Table Fan",                   "category": "cooling"},
    # Heating / Water
    "geyser_2kw":       {"watts": 2000, "label": "Electric Geyser (2kW)",       "category": "heating"},
    "geyser_1kw":       {"watts": 1000, "label": "Instant Geyser (1kW)",        "category": "heating"},
    "iron":             {"watts": 1000, "label": "Electric Iron",               "category": "heating"},
    "induction":        {"watts": 1500, "label": "Induction Cooktop",           "category": "heating"},
    # Kitchen
    "refrigerator_2star": {"watts": 150, "label": "Refrigerator 2★",           "category": "kitchen"},
    "refrigerator_5star": {"watts": 80,  "label": "Refrigerator 5★",           "category": "kitchen"},
    "microwave":        {"watts": 1200, "label": "Microwave Oven",              "category": "kitchen"},
    "mixer_grinder":    {"watts": 500,  "label": "Mixer Grinder",              "category": "kitchen"},
    # Entertainment / Office
    "tv_led_32":        {"watts": 60,   "label": "32\" LED TV",                 "category": "entertainment"},
    "tv_led_43":        {"watts": 90,   "label": "43\" LED TV",                 "category": "entertainment"},
    "set_top_box":      {"watts": 18,   "label": "Set-Top Box",                 "category": "entertainment"},
    "laptop":           {"watts": 65,   "label": "Laptop",                      "category": "entertainment"},
    "desktop_pc":       {"watts": 300,  "label": "Desktop PC + Monitor",        "category": "entertainment"},
    # Lighting
    "led_bulb":         {"watts": 10,   "label": "LED Bulb",                    "category": "lighting"},
    "cfl_bulb":         {"watts": 23,   "label": "CFL Bulb",                    "category": "lighting"},
    "tube_light_led":   {"watts": 18,   "label": "LED Tube Light",              "category": "lighting"},
    # Other
    "water_pump":       {"watts": 750,  "label": "Water Pump (0.5 HP)",         "category": "other"},
    "washing_machine":  {"watts": 500,  "label": "Washing Machine",             "category": "other"},
    "water_purifier":   {"watts": 25,   "label": "Water Purifier (RO)",         "category": "other"},
}

# Average tariff used for savings estimates (mid-slab WBSEDCL rate)
AVG_TARIFF_PER_UNIT = 7.0


def compute_appliance_monthly_units(appliance: ApplianceInput) -> float:
    """Calculate monthly kWh for a single appliance entry."""
    spec = APPLIANCE_DB.get(appliance.appliance_id)
    if not spec:
        return 0.0
    watts = spec["watts"]
    # Scale by months_active (e.g. AC only runs 5 months → prorate to monthly avg)
    monthly_fraction = min(appliance.months_active, 12) / 12
    units_per_month = (watts * appliance.hours_per_day * 30 / 1000) * appliance.quantity * monthly_fraction
    return round(units_per_month, 2)


def compute_theoretical_consumption(appliances: List[ApplianceInput]) -> Dict[str, float]:
    """
    Returns a dict: { appliance_id → monthly_units } plus a "__total__" key.
    """
    breakdown: Dict[str, float] = {}
    total = 0.0
    for appliance in appliances:
        units = compute_appliance_monthly_units(appliance)
        breakdown[appliance.appliance_id] = units
        total += units
    breakdown["__total__"] = round(total, 2)
    return breakdown


def compute_category_breakdown(appliances: List[ApplianceInput], breakdown: Dict[str, float]) -> Dict[str, float]:
    """Aggregate units by category for the pie chart."""
    categories: Dict[str, float] = {}
    total = breakdown.get("__total__", 1) or 1
    for appliance in appliances:
        spec = APPLIANCE_DB.get(appliance.appliance_id, {})
        cat = spec.get("category", "other")
        categories[cat] = round(categories.get(cat, 0) + breakdown.get(appliance.appliance_id, 0), 2)
    # Convert to percentages
    return {cat: round((v / total) * 100, 1) for cat, v in categories.items()}


def compute_feedback_suppression(tip_id: str, feedback_history: List[dict]) -> float:
    """
    Returns a suppression weight [0, 1] for a tip_id.
    Tips rated 'not_helpful' or 'already_doing' are suppressed.
    """
    relevant = [f for f in feedback_history if f.get("tip_id") == tip_id]
    if not relevant:
        return 0.0
    not_helpful = sum(1 for f in relevant if f["rating"] == "not_helpful")
    already_doing = sum(1 for f in relevant if f["rating"] == "already_doing")
    total = len(relevant)
    suppression = (not_helpful * 0.4 + already_doing * 0.6) / max(1, total)
    return min(suppression, 1.0)


def generate_tips(
    appliances: List[ApplianceInput],
    actual_units: float,
    breakdown: Dict[str, float],
    feedback_history: List[dict],
    has_error: bool = False,
    is_estimated: bool = False,
) -> List[GeneratedTip]:
    """
    Core tip generation logic. Returns a ranked list of GeneratedTip objects.
    Tips are ranked by: estimated_savings_units × (1 - suppression_weight).
    """
    tips: List[GeneratedTip] = []
    theoretical_total = breakdown.get("__total__", 0)

    # ── Helper to build a tip ─────────────────────────────────────────────
    def make_tip(
        tip_id, category, color, priority_label,
        title, short_desc, detail, actions,
        estimated_savings_units,
    ) -> GeneratedTip:
        suppression = compute_feedback_suppression(tip_id, feedback_history)
        savings_rupees = round(estimated_savings_units * AVG_TARIFF_PER_UNIT, 0)
        score = round(estimated_savings_units * (1 - suppression), 3)
        return GeneratedTip(
            id=tip_id,
            category=category,
            color=color,
            priority_label=priority_label,
            title=title,
            short_desc=short_desc,
            detail=detail,
            actions=actions,
            estimated_savings_units=estimated_savings_units,
            estimated_savings_rupees=savings_rupees,
            priority_score=score,
        )

    # ── Billing Error / Estimated (always highest priority) ───────────────
    if has_error:
        tips.append(make_tip(
            tip_id="billing_error",
            category="dispute",
            color="red",
            priority_label="🚨 Action Required",
            title="Billing Error Detected — File a Dispute",
            short_desc="Our engine found a calculation discrepancy. You may be overpaying.",
            detail=(
                "A tariff or slab calculation discrepancy was detected in this bill. Under the Electricity Act 2003, "
                "you have the right to dispute this bill. Download the pre-filled dispute letter and submit it to your "
                "local WBSEDCL sub-divisional office. Keep a copy of the bill and this audit report."
            ),
            actions=[
                "Download and sign the dispute letter (button below)",
                "Submit to your WBSEDCL Sub-Division Office in person",
                "Request an actual meter reading if you received an estimated bill",
                "Follow up within 30 days if no response is received",
            ],
            estimated_savings_units=max(0, actual_units - theoretical_total) if theoretical_total else 0,
        ))

    if is_estimated:
        tips.append(make_tip(
            tip_id="estimated_reading",
            category="dispute",
            color="amber",
            priority_label="⚠️ Action Required",
            title="Estimated Reading — Request an Actual Meter Read",
            short_desc="Estimated bills are often higher than actual consumption. You can request a correction.",
            detail=(
                "This bill was generated on an estimated meter reading. WBSEDCL uses your historical average, "
                "which can be significantly higher than your real consumption. You have the legal right to request "
                "an actual meter reading and a revised bill."
            ),
            actions=[
                "Visit your WBSEDCL customer care center with your meter reading",
                "Submit the actual reading via the WBSEDCL self-service portal",
                "Take a photo of your meter with date/time as evidence",
                "Request a corrected bill after actual reading is recorded",
            ],
            estimated_savings_units=round(actual_units * 0.15, 1),
        ))

    # ── Appliance-specific tips ───────────────────────────────────────────
    # Identify appliances the user has, sorted by their monthly unit consumption
    user_appliance_units = {
        a.appliance_id: breakdown.get(a.appliance_id, 0)
        for a in appliances
    }
    sorted_appliances = sorted(user_appliance_units.items(), key=lambda x: x[1], reverse=True)

    # --- AC Optimization ---
    ac_ids = [a for a in user_appliance_units if "ac_" in a and user_appliance_units[a] > 0]
    if ac_ids:
        total_ac_units = sum(user_appliance_units[a] for a in ac_ids)
        has_old_ac = any("3star" in a for a in ac_ids)
        saving = round(total_ac_units * 0.25, 1)  # 25% savings potential from temp + habits
        
        detail = (
            f"Your AC(s) are consuming an estimated {round(total_ac_units)} units/month — "
            f"that's {round(total_ac_units/max(actual_units,1)*100)}% of your total bill. "
        )
        if has_old_ac:
            saving_upgrade = round(total_ac_units * 0.35, 1)
            detail += (
                f"You have a fixed-speed (non-inverter) AC. Upgrading to a 5★ Inverter model "
                f"can reduce AC consumption by up to 35%, saving ~{saving_upgrade} units/month. "
            )
        detail += (
            "Additionally, setting the thermostat to 24°C instead of 18°C reduces power draw by ~24%. "
            "Cleaning the filter every 2 weeks improves efficiency by 10-15%."
        )

        actions = [
            f"Set AC thermostat to 24°C (saves ~{round(total_ac_units*0.06)} units/month per degree)",
            "Use 'Auto' fan mode instead of 'High' — compressor cycles less",
            "Clean the AC filter every 2 weeks for 10-15% better efficiency",
            "Use timer to turn off AC 30 mins before waking up",
        ]
        if has_old_ac:
            actions.append("Consider upgrading to an Inverter AC — 30-50% less consumption")

        tips.append(make_tip(
            tip_id="ac_optimization",
            category="cooling",
            color="cyan",
            priority_label="High Impact",
            title="AC Optimization — Your Biggest Savings Opportunity",
            short_desc=f"Your AC uses ~{round(total_ac_units)} units/month. Better habits can save ~{saving} units (₹{round(saving * AVG_TARIFF_PER_UNIT)}/month).",
            detail=detail,
            actions=actions,
            estimated_savings_units=saving,
        ))

    # --- Geyser Optimization ---
    geyser_ids = [a for a in user_appliance_units if "geyser" in a and user_appliance_units[a] > 0]
    if geyser_ids:
        geyser_units = sum(user_appliance_units[a] for a in geyser_ids)
        saving = round(geyser_units * 0.4, 1)
        tips.append(make_tip(
            tip_id="geyser_optimization",
            category="heating",
            color="orange",
            priority_label="High Impact",
            title="Electric Geyser — High Energy, Easy to Reduce",
            short_desc=f"Your geyser consumes ~{round(geyser_units)} units/month. Smart usage cuts this by 40%.",
            detail=(
                f"Your electric geyser(s) are consuming ~{round(geyser_units)} units/month. "
                "This is one of the easiest reductions: set the geyser thermostat to 50°C (default is often 75°C). "
                "Use a timer to heat water 30 minutes before your typical shower time, then switch off. "
                "A solar water heater can eliminate this cost entirely — payback in 2-3 years in West Bengal's climate."
            ),
            actions=[
                "Set geyser thermostat to 50°C (75°C wastes 30% extra energy)",
                "Use a 24-hour timer socket — heat water only for 45 mins in the morning",
                "Insulate your geyser tank to reduce standby heat loss",
                "Consider a solar water heater — saves 1,500-2,000 units/year",
            ],
            estimated_savings_units=saving,
        ))

    # --- Refrigerator Upgrade ---
    fridge_ids = [a for a in user_appliance_units if "refrigerator" in a]
    if any("2star" in a for a in fridge_ids):
        fridge_units = sum(user_appliance_units.get(a, 0) for a in fridge_ids if "2star" in a)
        saving = round(fridge_units * 0.4, 1)
        tips.append(make_tip(
            tip_id="refrigerator_upgrade",
            category="kitchen",
            color="emerald",
            priority_label="Long-term Saving",
            title="Old Refrigerator — Upgrade for Consistent Savings",
            short_desc=f"Your 2★ fridge runs 24/7 and uses ~{round(fridge_units)} units/month. A 5★ model saves ~{saving} units.",
            detail=(
                "Your refrigerator never switches off — it consumes electricity 24/7. A 2-star rated fridge "
                "uses nearly double the electricity of a 5-star equivalent. While the upfront cost of upgrading "
                "is real, the energy savings typically pay back the price difference in 3-4 years. Until then, "
                "keep the coils dust-free, avoid placing it near heat sources, and set temperature to 3-4°C (not colder)."
            ),
            actions=[
                "Keep the refrigerator coils clean — dusty coils use 30% more power",
                "Set fridge temperature to 3-4°C and freezer to -15°C (not colder)",
                "Don't store hot food directly — let it cool to room temperature first",
                "Check door seals — a loose seal wastes significant energy",
                "Plan to upgrade to a 5★ fridge when replacing — saves ~40% long-term",
            ],
            estimated_savings_units=saving,
        ))

    # --- Phantom Load / Standby ---
    phantom_units = round(actual_units * 0.12, 1)  # Standby is typically ~10-15% of total
    tips.append(make_tip(
        tip_id="phantom_load",
        category="phantom",
        color="slate",
        priority_label="Easy Fix",
        title="Standby 'Phantom' Load — Silent Power Drain",
        short_desc=f"Devices on standby consume ~{phantom_units} units/month (~12% of your bill) invisibly.",
        detail=(
            "Televisions, set-top boxes, phone chargers, Wi-Fi routers, microwaves, and gaming consoles "
            "consume electricity even when 'off' or in standby mode. This 'phantom load' or 'vampire power' "
            f"is estimated at ~{phantom_units} units/month for your home. A ₹200 smart power strip can eliminate this "
            "for entertainment devices. Unplugging chargers when not in use is free."
        ),
        actions=[
            "Plug TV, set-top box, and speakers into one power strip — switch off at night",
            "Unplug phone chargers when not charging (draws power even with no phone)",
            "Put the Wi-Fi router on a timer — turn off at 1 AM, back on at 6 AM",
            "Use a smart plug to monitor and schedule individual device usage",
        ],
        estimated_savings_units=phantom_units,
    ))

    # --- Solar ROI Tip ---
    annual_units = actual_units * 12
    system_kw = max(1, min(10, round(annual_units / 1200)))  # 1200 units/kW/year in WB
    annual_savings = round(system_kw * 1200 * AVG_TARIFF_PER_UNIT)
    monthly_savings = round(annual_savings / 12)
    subsidy = 78000 if system_kw >= 3 else (system_kw * 30000)
    gross_cost = system_kw * 65000
    net_cost = gross_cost - subsidy
    payback_years = round(net_cost / annual_savings, 1) if annual_savings > 0 else 0

    tips.append(make_tip(
        tip_id="solar_roi",
        category="solar",
        color="yellow",
        priority_label="Investment",
        title=f"Rooftop Solar ({system_kw}kW) — Break Even in {payback_years} Years",
        short_desc=f"Based on your {actual_units} units/month, a {system_kw}kW system saves ~₹{monthly_savings}/month after ₹{subsidy:,} subsidy.",
        detail=(
            f"Your consumption of {actual_units} units/month means a {system_kw}kW system is ideal for you. "
            f"Under PM Surya Ghar, you receive a ₹{subsidy:,} subsidy. "
            f"Gross installation cost: ~₹{gross_cost:,}. Net investment: ~₹{net_cost:,}. "
            f"Annual savings: ~₹{annual_savings:,}. Payback: {payback_years} years. "
            "Panels last 25+ years — that's 20+ years of near-free electricity after payback. "
            "WBSEDCL net metering lets you export excess power back to the grid."
        ),
        actions=[
            "Apply at pmsuryaghar.gov.in — subsidy is a direct bank transfer",
            f"Get quotes for {system_kw}kW from 3+ WBREDA empanelled vendors",
            "Apply for WBSEDCL net metering simultaneously with installation",
            "Ensure your sanctioned load allows the proposed system capacity",
        ],
        estimated_savings_units=round(system_kw * 1200 / 12, 1),
    ))

    # --- Slab Management (based on actual vs theoretical) ---
    gap = actual_units - theoretical_total
    if gap > 20 and theoretical_total > 0:
        tips.append(make_tip(
            tip_id="unexplained_usage",
            category="audit",
            color="violet",
            priority_label="Investigate",
            title=f"Unexplained {round(gap)} Units — Something Is Pulling More Power",
            short_desc=f"Your profile predicts {round(theoretical_total)} units but your bill shows {round(actual_units)}. Something is off.",
            detail=(
                f"Based on your appliance profile, your home should consume approximately {round(theoretical_total)} units/month. "
                f"However, your actual bill shows {round(actual_units)} units — a gap of {round(gap)} units "
                f"({round(gap/max(actual_units,1)*100)}%). This unexplained usage could be: "
                "(1) An appliance you haven't listed, (2) Under-reported usage hours, "
                "(3) An old appliance with degraded efficiency, or (4) A faulty meter. "
                "Update your appliance profile to get more accurate tips, or consider a meter inspection."
            ),
            actions=[
                "Review your appliance profile — did you miss any appliances?",
                "Check if any appliance runs more hours than you estimated",
                "Look for old appliances — efficiency degrades 15-20% over 10 years",
                "Contact WBSEDCL for a meter accuracy test if gap is persistent",
            ],
            estimated_savings_units=round(gap * 0.5, 1),
        ))
    elif theoretical_total > 0 and actual_units < theoretical_total * 0.8:
        tips.append(make_tip(
            tip_id="lower_than_expected",
            category="audit",
            color="emerald",
            priority_label="Great Job",
            title="You're Consuming Less Than Expected — Excellent Habits!",
            short_desc=f"Your profile predicts {round(theoretical_total)} units but you're only using {round(actual_units)}. Keep it up!",
            detail=(
                f"Your actual consumption of {round(actual_units)} units is significantly lower than the "
                f"theoretical estimate of {round(theoretical_total)} units based on your appliances. "
                "This suggests you are using appliances very efficiently — perhaps shorter durations, "
                "better thermostat habits, or more mindful energy use overall. This is excellent."
            ),
            actions=[
                "Continue your current habits — you're already in a great place",
                "Consider solar to convert your efficiency into actual zero-cost electricity",
                "Share your habits with family — consistent savings compound over years",
            ],
            estimated_savings_units=0,
        ))

    # ── Sort by priority_score descending ─────────────────────────────────
    tips.sort(key=lambda t: t.priority_score, reverse=True)
    return tips
