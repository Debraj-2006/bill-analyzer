from typing import Dict


def calculate_wbsedcl_bill(units: float, months: int = 3) -> Dict[str, float]:
    """
    Calculates estimated WBSEDCL Domestic-A bill components for a given number of units and months.
    Defaulting to quarterly (3 months) as WBSEDCL usually bills quarterly.
    """
    # Domestic-A Slabs (per month)
    # 0-102: 5.30
    # 103-180: 5.97
    # 181-300: 6.97
    # 301-600: 7.31
    # 601+: 8.18

    slabs = [
        (102 * months, 5.30),
        (180 * months, 5.97),
        (300 * months, 6.97),
        (600 * months, 7.31),
        (float('inf'), 8.18)
    ]

    energy_charge = 0.0
    remaining_units = units
    previous_limit = 0

    for limit, rate in slabs:
        if remaining_units <= 0:
            break

        slab_units = min(remaining_units, limit - previous_limit)
        energy_charge += slab_units * rate
        remaining_units -= slab_units
        previous_limit = limit

    fixed_charge = 40.0 * months  # Approximate fixed charge
    electricity_duty = energy_charge * 0.05  # 5% duty

    total_amount = energy_charge + fixed_charge + electricity_duty

    return {
        "energy_charge": round(energy_charge, 2),
        "fixed_charge": round(fixed_charge, 2),
        "electricity_duty": round(electricity_duty, 2),
        "total_amount": round(total_amount, 2)
    }
