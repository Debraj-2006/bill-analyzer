import pdfplumber
import re
from typing import Dict, Any


def parse_cesc_bill(text: str) -> Dict[str, Any]:
    """
    Dedicated parsing logic for CESC (Calcutta Electric Supply Corporation) bills.
    """
    # 1. Consumer No (9 to 12 digits)
    consumer_id_match = (
        re.search(r"(?:Consumer\s*No|Consumer\s*No\.|Consumer\s*Number|Con\s*No)\s*[:\.-]?\s*(\d{9,12})", text, re.IGNORECASE) or
        re.search(r"\b\d{9,12}\b", text)
    )
    
    # 2. Customer ID (11 digits, like 48001814701)
    customer_id_match = re.search(r"Customer\s*ID[\s\.-]*(\d{11})", text, re.IGNORECASE)
    
    # 3. Consumer Name
    name_match = re.search(r"Customer\s*ID[\s\.]+\d+\s+For\s+Immediate\s*\n\s*([A-Za-z\s\.\&\-\,\/]+?)(?:\s+Assistance)?\n", text, re.IGNORECASE)
    if not name_match:
        name_match = re.search(r"(?:Name|Consumer\s*Name|Cust\s*Name)\s*[:\.-]?\s*([A-Za-z\s\.\&\-\,\/]+)", text, re.IGNORECASE)

    # 4. Billing Period
    billing_period_match = (
        re.search(r"YOUR\s+ELECTRICITY\s+BILL\s+FOR\s+([A-Za-z\s]+\d{4})", text, re.IGNORECASE) or
        re.search(r"BillC\s*alculations\s*for\s*The\s*Month\s*([A-Za-z\s]+\d{4})", text, re.IGNORECASE)
    )

    # 5. Units Consumed
    units_match = (
        re.search(r"Units\s+Billed\s*[:\.-]?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE) or
        re.search(r"Units\s+Consumed\s*[:\.-]?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE) or
        re.search(r"Consumed\s+Biled\s+Charges.*\n.*?\s+(\d+)\s+\d+(?:\.\d+)?\s*$", text, re.IGNORECASE) or
        re.search(r"(?:Units|Consumption|KWH)\s*[:\.-]?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    )

    # 6. Total Amount
    amount_match = (
        re.search(r"Net\s+Amount\s*[:\.-]?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE) or
        re.search(r"Net\s+Payable\s*Amount\s*[:\.-]?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE) or
        re.search(r"(?:Total\s*Payable|Amount\s*Payable|Bill\s*Amount)\s*[:\.-]?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    )

    # 7. Reading Status
    reading_status = "ACTUAL"
    if "NOTIONAL" in text.upper() or "ESTIMATED" in text.upper():
        reading_status = "ESTIMATED"

    # 8. Due Date
    due_date_match = re.search(r"Due\s*Date\s*\n(?:.*\n){0,2}?\s*(\d{2}/\d{2}/\d{2,4})", text, re.IGNORECASE)
    if not due_date_match:
        due_date_match = re.search(r"(?:Due\s*Date|Pay\s*By)\s*[:\.-]?\s*(\d{2}[-/\.]\d{2}[-/\.]\d{2,4})", text, re.IGNORECASE)

    due_date_str = "24-03-2026"
    if due_date_match:
        raw_date = due_date_match.group(1).replace("/", "-").replace(".", "-")
        parts = raw_date.split("-")
        if len(parts) == 3:
            day, month, year = parts
            if len(year) == 2:
                year = "20" + year
            due_date_str = f"{day}-{month}-{year}"

    # 9. Billed Months
    billed_months = 1
    months_match = re.search(r"BILL?ED\s+FOR\s+(\d+)\s+MONTHS", text, re.IGNORECASE)
    if months_match:
        billed_months = int(months_match.group(1))

    # 10. Meter Reading
    meter_reading = None
    meter_match = re.search(r"\b\d{9}\b\s+\S+\s+\d+\s+(\d+)\s+(\d+)", text)
    if meter_match:
        meter_reading = int(meter_match.group(2))

    # 11. Adjustments / Arrears
    adjustments_match = (
        re.search(r"Adjustments\s*[:\.-]?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE) or
        re.search(r"EARLIER\s+BILLS\s+BF\s+(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    )
    adjustments = float(adjustments_match.group(1)) if adjustments_match else 0.0

    # 12. Rebate
    rebate_match = re.search(r"Rebate\s*\(CUMUL\)\s*[:\.\*\-\s]*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    rebate = float(rebate_match.group(1)) if rebate_match else 0.0

    results = {
        "provider": "CESC",
        "consumer_id": consumer_id_match.group(1).strip() if (consumer_id_match and len(consumer_id_match.groups()) > 0) else (consumer_id_match.group(0).strip() if consumer_id_match else None),
        "customer_id": customer_id_match.group(1).strip() if customer_id_match else "",
        "consumer_name": name_match.group(1).strip() if name_match else "Valued Consumer",
        "billing_period": billing_period_match.group(1).strip() if billing_period_match else "Current Cycle",
        "units_consumed": float(units_match.group(1)) if units_match else None,
        "total_amount": float(amount_match.group(1)) if amount_match else None,
        "reading_status": reading_status,
        "due_date": due_date_str,
        "billed_months": billed_months,
        "meter_reading": meter_reading or None,
        "adjustments": adjustments,
        "rebate": rebate
    }

    if not results["consumer_id"]:
        raise ValueError("Could not extract Consumer ID from the CESC bill.")
    if results["units_consumed"] is None:
        raise ValueError("Could not extract Units Consumed from the CESC bill.")
    if results["total_amount"] is None:
        raise ValueError("Could not extract Total Amount from the CESC bill.")

    results["consumer_no"] = results["consumer_id"]
    results["bill_month"] = results["billing_period"]
    results["is_estimated"] = results["reading_status"].upper() == "ESTIMATED"
    return results


def parse_generic_bill(text: str, detected_provider: str) -> Dict[str, Any]:
    """
    Intelligent high-precision generic parser for any custom or unrecognized utility board.
    """
    # 1. Consumer ID / Account No
    consumer_id_match = re.search(r"(?:Consumer\s*(?:No|No\.|Number|ID|Account|Acc\s*No))[\s\.:-]*(\d+)", text, re.IGNORECASE)
    if not consumer_id_match:
        consumer_id_match = re.search(r"\b\d{9,12}\b", text)
        
    consumer_id = consumer_id_match.group(1).strip() if (consumer_id_match and len(consumer_id_match.groups()) > 0) else (consumer_id_match.group(0).strip() if consumer_id_match else None)

    # 2. Customer ID
    customer_id_match = re.search(r"(?:Customer\s*(?:ID|No|Number|Code))[\s\.:-]*(\d+)", text, re.IGNORECASE)
    customer_id = customer_id_match.group(1).strip() if customer_id_match else ""

    # 3. Consumer Name
    name_match = re.search(r"(?:Name|Consumer\s*Name|Cust\s*Name|Subscriber)[\s\.:-]*([A-Za-z\s\.\&\-\,\/]+)", text, re.IGNORECASE)
    consumer_name = "Valued Consumer"
    if name_match:
        consumer_name = name_match.group(1).split('\n')[0].strip()

    # 4. Billing Period
    billing_period_match = re.search(r"(?:Billing\s*Period|Bill\s*Period|Period|Bill\s*Month)[\s\.:-]*([A-Za-z0-9\s\-\/\(\)\.]+)", text, re.IGNORECASE)
    billing_period = "Current Billing Cycle"
    if billing_period_match:
        billing_period = billing_period_match.group(1).split('\n')[0].strip()

    # 5. Units Consumed
    units_match = re.search(r"(?:Units\s*(?:Consumed|Billed|Charged)|Energy\s*Consumed|Consumption|Units|KWH)[\s\.:-]*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    units_consumed = float(units_match.group(1)) if units_match else None

    # 6. Total Amount
    amount_match = re.search(r"(?:Net\s*Payable\s*Amount|Net\s*Payable|Net\s*Amount|Payable\s*Amount|Total\s*Payable|Amount\s*Due|Bill\s*Amount)[\s\.:-]*\s*(?:₹|Rs\.?)?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    total_amount = float(amount_match.group(1)) if amount_match else None

    # 7. Reading Status
    reading_status = "ACTUAL"
    if "ESTIMATED" in text.upper() or "NOTIONAL" in text.upper():
        reading_status = "ESTIMATED"

    # 8. Due Date
    due_date_match = re.search(r"(?:Due\s*Date|Pay\s*By)[\s\.:-]*\s*(\d{2}[-/\.]\d{2}[-/\.]\d{2,4})", text, re.IGNORECASE)
    due_date = due_date_match.group(1).strip() if due_date_match else "30-06-2026"

    # 9. Billed Months
    billed_months = 1
    months_match = re.search(r"(?:BILL?ED\s+FOR\s+|\b\d+\s*months?\s+billing\b)(\d+)", text, re.IGNORECASE)
    if months_match:
        billed_months = int(months_match.group(1))

    # 10. Adjustments / Arrears
    adjustments_match = re.search(r"(?:Adjustments|Arrears|Surcharge|Previous\s*Due)[\s\.:-]*\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    adjustments = float(adjustments_match.group(1)) if adjustments_match else 0.0

    # 11. Rebate
    rebate_match = re.search(r"(?:Rebate|Discount|Prompt\s*Payment)[\s\.:-]*\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    rebate = float(rebate_match.group(1)) if rebate_match else 0.0

    results = {
        "provider": detected_provider,
        "consumer_id": consumer_id,
        "customer_id": customer_id,
        "consumer_name": consumer_name,
        "billing_period": billing_period,
        "units_consumed": units_consumed,
        "total_amount": total_amount,
        "reading_status": reading_status,
        "due_date": due_date,
        "billed_months": billed_months,
        "meter_reading": None,
        "adjustments": adjustments,
        "rebate": rebate
    }

    if not results["consumer_id"]:
        raise ValueError("Could not extract Consumer ID from the bill.")
    if results["units_consumed"] is None:
        raise ValueError("Could not extract Units Consumed from the bill.")
    if results["total_amount"] is None:
        raise ValueError("Could not extract Total Amount from the bill.")

    results["consumer_no"] = results["consumer_id"]
    results["bill_month"] = results["billing_period"]
    results["is_estimated"] = results["reading_status"].upper() == "ESTIMATED"
    return results


def parse_wbsedcl_bill(file_path: str) -> Dict[str, Any]:
    """
    Entry point for the parser. Reads PDF file, dynamically detects the utility company 
    from the headers/content, and delegates to the appropriate high-precision parser.
    """
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += (page.extract_text() or "") + "\n"
    except Exception as e:
        print(f"Error reading PDF with pdfplumber: {e}")

    # Check if the PDF is unreadable or empty (scanned image)
    if not text.strip():
        raise ValueError(
            "The uploaded file appears to be a scanned image or contains no readable text. "
            "Image parsing is currently not supported. Please upload an original digital PDF bill."
        )

    # 1. Check for CESC signature
    if "CESC" in text.upper():
        return parse_cesc_bill(text)

    # 2. Check for other major known boards
    KNOWN_BOARDS = [
        "BESCOM", "TANGEDCO", "TNEB", "MSEDCL", "MSEB", "TATA POWER", "ADANI POWER", 
        "BSES RAJDHANI", "BSES YAMUNA", "UPPCL", "PSPCL", "KSEB", "APDCL", "APCPDCL", 
        "TSSPDCL", "CSPDCL", "BEST", "TORRENT POWER"
    ]
    
    text_upper = text.upper()
    for board in KNOWN_BOARDS:
        if board in text_upper:
            # Reformat name beautifully
            provider_name = board.title().replace("Bses", "BSES").replace("Tneb", "TNEB").replace("Mseb", "MSEB").replace("Kseb", "KSEB")
            return parse_generic_bill(text, provider_name)

    # 3. Smart Regex Company Name Extraction from Header
    # Searches for custom electric boards in first few lines (headers)
    header_lines = "\n".join(text.split("\n")[:10])
    board_match = re.search(
        r"([A-Za-z0-9\s\.,\-]+(?:Electricity|Electric|Vidyut|Power|Utility|Energy)\s+(?:Board|Supply|Distribution|Corporation|Ltd|Limited|Company))",
        header_lines, re.IGNORECASE
    )
    if board_match:
        provider_name = re.sub(r"\s+", " ", board_match.group(1)).strip().title()
        return parse_generic_bill(text, provider_name)

    # 4. Check for WBSEDCL signature (Default)
    if "WBSEDCL" in text_upper or "WEST BENGAL STATE ELECTRICITY" in text_upper:
        # Standard WBSEDCL parsing logic
        consumer_id_match = (
            re.search(r"(?:Consumer\s*ID|Consumer\s*No|Consumer\s*Number|Con\s*ID)\s*[:\.-]?\s*(\d{9,12})", text, re.IGNORECASE) or
            re.search(r"\b\d{9}\b", text)
        )
        
        name_match = re.search(r"(?:Name|Consumer\s*Name|Cust\s*Name)\s*[:\.-]?\s*([A-Za-z\s\.\&\-\,\/]+)", text, re.IGNORECASE)
        billing_period_match = re.search(r"(?:Billing\s*Period|Bill\s*Period|Period)\s*[:\.-]?\s*([A-Za-z0-9\s\-\/\(\)\.]+)", text, re.IGNORECASE)
        units_match = re.search(r"(?:Units\s*Consumed|Energy\s*Consumed|Consumption|Units|KWH)\s*[:\.-]?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
        amount_match = re.search(r"(?:Net\s*Payable\s*Amount|Net\s*Payable|Net\s*Amount|Payable\s*Amount|Total\s*Payable|Amount\s*Due|Bill\s*Amount)\s*[:\.-]?\s*(?:₹|Rs\.?)?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
        reading_status_match = re.search(r"(?:Reading\s*Status|Status|Read\s*Type)\s*[:\.-]?\s*(\w+)", text, re.IGNORECASE)
        due_date_match = re.search(r"(?:Due\s*Date|Pay\s*By)\s*[:\.-]?\s*(\d{2}[-/\.]\d{2}[-/\.]\d{4})", text, re.IGNORECASE)

        results = {
            "provider": "WBSEDCL",
            "consumer_id": consumer_id_match.group(1).strip() if (consumer_id_match and len(consumer_id_match.groups()) > 0) else (consumer_id_match.group(0).strip() if consumer_id_match else None),
            "customer_id": "",
            "consumer_name": name_match.group(1).strip() if name_match else "Valued Consumer",
            "billing_period": billing_period_match.group(1).strip() if billing_period_match else "Current Cycle",
            "units_consumed": float(units_match.group(1)) if units_match else None,
            "total_amount": float(amount_match.group(1)) if amount_match else None,
            "reading_status": reading_status_match.group(1).strip() if reading_status_match else "ACTUAL",
            "due_date": due_date_match.group(1).strip() if due_date_match else None,
            "billed_months": 3,
            "meter_reading": None,
            "adjustments": 0.0,
            "rebate": 0.0
        }

        if not results["consumer_id"]:
            raise ValueError("Could not extract Consumer ID from the WBSEDCL bill.")
        if results["units_consumed"] is None:
            raise ValueError("Could not extract Units Consumed from the WBSEDCL bill.")
        if results["total_amount"] is None:
            raise ValueError("Could not extract Total Amount from the WBSEDCL bill.")

        if results["consumer_name"]:
            results["consumer_name"] = results["consumer_name"].split('\n')[0].strip()
        if results["billing_period"]:
            results["billing_period"] = results["billing_period"].split('\n')[0].strip()
        if results["reading_status"]:
            results["reading_status"] = results["reading_status"].split('\n')[0].strip()

        results["consumer_no"] = results["consumer_id"]
        results["bill_month"] = results["billing_period"]
        results["is_estimated"] = (results.get("reading_status") or "").lower() == "estimated"
        return results

    # 5. Ultimate Fallback as a standard recognized Board
    return parse_generic_bill(text, "Generic Utility Board")
