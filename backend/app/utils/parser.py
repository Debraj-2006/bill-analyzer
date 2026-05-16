import pdfplumber
import re
from typing import Dict, Any


def parse_wbsedcl_bill(file_path: str) -> Dict[str, Any]:
    """
    Extracts key information from a WBSEDCL PDF bill.
    """
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"

    # Basic patterns for WBSEDCL bills
    patterns = {
        "consumer_id": r"Consumer ID\s*:\s*(\d+)",
        "consumer_name": r"Name\s*:\s*(.*)",
        "billing_period": r"Billing Period\s*:\s*(.*)",
        "units_consumed": r"Units Consumed\s*:\s*(\d+\.?\d*)",
        "total_amount": r"Net Payable Amount\s*:\s*₹?\s*(\d+\.?\d*)",
        "reading_status": r"Reading Status\s*:\s*(\w+)",
        "due_date": r"Due Date\s*:\s*(\d{2}-\d{2}-\d{4})"
    }

    results = {}
    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            results[key] = match.group(1).strip()
        else:
            results[key] = None

    # Post-processing
    if results.get("units_consumed"):
        results["units_consumed"] = float(results["units_consumed"])
    if results.get("total_amount"):
        results["total_amount"] = float(results["total_amount"])

    results["is_estimated"] = (results.get("reading_status") or "").lower() == "estimated"

    return results
