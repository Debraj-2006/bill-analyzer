from typing import Dict, Any, List


def calculate_wbsedcl_bill(units: float, months: int = 3) -> Dict[str, Any]:
    """
    Calculates estimated WBSEDCL Domestic-A bill components for a given number of units and months.
    Defaulting to quarterly (3 months) as WBSEDCL usually bills quarterly.
    """
    # Domestic-A Slabs (per month, multiply limits by billed months)
    slabs_def = [
        (102 * months, 5.30, "0 - 102 Units/mo Tier"),
        (180 * months, 5.97, "103 - 180 Units/mo Tier"),
        (300 * months, 6.97, "181 - 300 Units/mo Tier"),
        (600 * months, 7.31, "301 - 600 Units/mo Tier"),
        (float('inf'), 8.18, "601+ Units/mo Tier")
    ]

    energy_charge = 0.0
    remaining_units = units
    previous_limit = 0
    slabs_breakdown = []

    for limit, rate, label in slabs_def:
        if remaining_units <= 0:
            break

        slab_limit = limit - previous_limit
        slab_units = min(remaining_units, slab_limit)
        slab_cost = slab_units * rate
        energy_charge += slab_cost
        remaining_units -= slab_units
        previous_limit = limit

        slabs_breakdown.append({
            "label": label,
            "units": round(slab_units, 2),
            "rate": rate,
            "charge": round(slab_cost, 2)
        })

    # Fixed charge (Customer charge)
    customer_charge = 40.0 * months
    
    # State duty (Electricity Duty) - 5% of energy charges
    state_duty = energy_charge * 0.05
    
    # Fuel surcharge (FSC) - WBSEDCL default standard
    fsc = 0.0

    total_amount = energy_charge + customer_charge + state_duty + fsc

    return {
        "energy_charge": round(energy_charge, 2),
        "customer_charge": round(customer_charge, 2),
        "fsc": round(fsc, 2),
        "state_duty": round(state_duty, 2),
        "total_amount": round(total_amount, 2),
        "slabs": slabs_breakdown
    }


def calculate_cesc_bill(units: float, months: int = 1) -> Dict[str, Any]:
    """
    Calculates estimated CESC Domestic-G / G-LL bill components for a given number of units and months.
    Defaulting to 1 month as CESC usually bills monthly.
    """
    avg_monthly = units / max(1, months)
    energy_charge = 0.0
    slabs_breakdown = []
    
    if avg_monthly <= 25:
        # Life Line (G-LL) tariff - 5.18 for all units
        energy_charge = units * 5.18
        slabs_breakdown.append({
            "label": "Lifeline (G-LL) Tier",
            "units": round(units, 2),
            "rate": 5.18,
            "charge": round(energy_charge, 2)
        })
    else:
        # Standard G tariff slabs (per month, so multiply by months)
        slabs_def = [
            (60 * months, 6.57, "0 - 60 Units/mo Tier"),
            (100 * months, 7.24, "61 - 100 Units/mo Tier"),
            (150 * months, 7.45, "101 - 150 Units/mo Tier"),
            (300 * months, 7.62, "151 - 300 Units/mo Tier"),
            (float('inf'), 9.21, "301+ Units/mo Tier")
        ]
        
        remaining_units = units
        previous_limit = 0
        
        for limit, rate, label in slabs_def:
            if remaining_units <= 0:
                break
            
            slab_limit = limit - previous_limit
            slab_units = min(remaining_units, slab_limit)
            slab_cost = slab_units * rate
            energy_charge += slab_cost
            remaining_units -= slab_units
            previous_limit = limit

            slabs_breakdown.append({
                "label": label,
                "units": round(slab_units, 2),
                "rate": rate,
                "charge": round(slab_cost, 2)
            })

    # CESC Fixed Charges (₹15 per KVA/month, assuming 1 KVA standard domestic load)
    fixed_charge = 15.0 * months
    
    # CESC Meter Rent (₹10 per month standard)
    meter_rent = 10.0 * months
    
    # FPPAS (Fuel adjustment) - 8.2% of Energy + Fixed charges
    fppas = (energy_charge + fixed_charge) * 0.082
    
    # Electricity Duty - 0.0 for Lifeline, else 5% (approx) for standard
    electricity_duty = 0.0 if avg_monthly <= 25 else (energy_charge * 0.05)
    
    total_amount = energy_charge + fixed_charge + meter_rent + fppas + electricity_duty
    
    return {
        "energy_charge": round(energy_charge, 2),
        "fixed_charge": round(fixed_charge, 2),
        "meter_rent": round(meter_rent, 2),
        "fppas": round(fppas, 2),
        "electricity_duty": round(electricity_duty, 2),
        "total_amount": round(total_amount, 2),
        "slabs": slabs_breakdown
    }


def calculate_generic_bill(units: float, months: int = 1) -> Dict[str, Any]:
    """
    Calculates estimated bill components for any custom/generic utility board using average national sliding slabs.
    """
    # Dynamic national domestic sliding-scale slabs (per month, multiply limits by billed months)
    slabs_def = [
        (100 * months, 5.20, "0 - 100 Units/mo Tier"),
        (200 * months, 6.50, "101 - 200 Units/mo Tier"),
        (300 * months, 7.20, "201 - 300 Units/mo Tier"),
        (float('inf'), 8.20, "301+ Units/mo Tier")
    ]

    energy_charge = 0.0
    remaining_units = units
    previous_limit = 0
    slabs_breakdown = []

    for limit, rate, label in slabs_def:
        if remaining_units <= 0:
            break

        slab_limit = limit - previous_limit
        slab_units = min(remaining_units, slab_limit)
        slab_cost = slab_units * rate
        energy_charge += slab_cost
        remaining_units -= slab_units
        previous_limit = limit

        slabs_breakdown.append({
            "label": label,
            "units": round(slab_units, 2),
            "rate": rate,
            "charge": round(slab_cost, 2)
        })

    # Fixed Customer Charge (₹40.00/mo) + Standard Meter Rent (₹10.00/mo)
    customer_charge = 50.0 * months
    
    # Fuel Surcharge (FSC) - ₹0.10 per unit consumed
    fsc = units * 0.10
    
    # State Electricity Duty - 5% of energy charges
    state_duty = energy_charge * 0.05

    total_amount = energy_charge + customer_charge + fsc + state_duty

    return {
        "energy_charge": round(energy_charge, 2),
        "customer_charge": round(customer_charge, 2),
        "fsc": round(fsc, 2),
        "state_duty": round(state_duty, 2),
        "total_amount": round(total_amount, 2),
        "slabs": slabs_breakdown
    }
