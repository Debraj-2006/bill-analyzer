from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
from datetime import datetime
import io


def generate_dispute_letter(bill_data: dict, reason: str) -> bytes:
    """
    Generates a formal dispute letter as a PDF with proper text wrapping.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    margin = 50
    max_width = width - (2 * margin)

    # Helper for drawing wrapped text
    def draw_wrapped(text, x, y, font="Helvetica", size=11, bold=False, spacing=15):
        c.setFont(f"{font}-Bold" if bold else font, size)
        lines = simpleSplit(text, font + ("-Bold" if bold else ""), size, max_width)
        for line in lines:
            if y < margin + 50:  # Simple page break logic
                c.showPage()
                y = height - margin
                c.setFont(f"{font}-Bold" if bold else font, size)
            c.drawString(x, y, line)
            y -= spacing
        return y

    provider = bill_data.get("provider", "WBSEDCL")
    if provider == "CESC":
        recipient_lines = [
            "The Commercial Manager,",
            "CESC Limited,",
            "Kolkata, West Bengal."
        ]
    elif provider == "WBSEDCL":
        recipient_lines = [
            "The Station Manager,",
            "WBSEDCL Sub-Division Office,",
            "West Bengal."
        ]
    elif provider == "IPCL":
        recipient_lines = [
            "The Commercial & Customer Services Head,",
            "India Power Corporation Limited (IPCL),",
            "Asansol/Kolkata, West Bengal."
        ]
    else:
        recipient_lines = [
            "The Customer Relations Officer / Station Manager,",
            f"{provider},",
            "Electricity Supply Division Office."
        ]

    # Header
    y = height - margin
    y = draw_wrapped("To,", margin, y, bold=True, size=12)
    for line in recipient_lines:
        y = draw_wrapped(line, margin, y, bold=True, size=12)
    
    y -= 10
    y = draw_wrapped(f"Subject: Formal Dispute Regarding Electricity Bill – Consumer ID: {bill_data.get('consumer_id', 'N/A')}", margin, y, bold=True, size=12)
    
    y -= 10
    y = draw_wrapped(f"Date: {datetime.now().strftime('%d %B, %Y')}", margin, y)
    
    y -= 20
    y = draw_wrapped("Dear Sir/Madam,", margin, y)
    
    y -= 5
    body_intro = (
        f"I am writing to formally dispute my electricity bill for the period {bill_data.get('billing_period', 'N/A')} "
        f"for Consumer ID: {bill_data.get('consumer_id', 'N/A')}. The billed amount of ₹{bill_data.get('total_amount', 'N/A')} "
        f"appears to be incorrect based on my consumption analysis."
    )
    y = draw_wrapped(body_intro, margin, y)
    
    y -= 10
    y = draw_wrapped("Reason for Dispute:", margin, y, bold=True)
    y = draw_wrapped(reason, margin, y)
    
    y -= 10
    closing = (
        "I request you to kindly re-verify the meter reading and the applied tariff slabs for this period. "
        "I have attached a copy of the disputed bill for your reference. Looking forward to a swift resolution."
    )
    y = draw_wrapped(closing, margin, y)
    
    y -= 30
    y = draw_wrapped("Yours faithfully,", margin, y)
    y -= 10
    y = draw_wrapped(str(bill_data.get('consumer_name', 'Customer')), margin, y, bold=True)
    y = draw_wrapped(f"Consumer No: {bill_data.get('consumer_id', 'N/A')}", margin, y)

    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
