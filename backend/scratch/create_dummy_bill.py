from reportlab.pdfgen import canvas
import os

def generate_pdf(filename="dummy_wbsedcl_bill.pdf"):
    c = canvas.Canvas(filename)
    c.drawString(100, 750, "West Bengal State Electricity Distribution Company Limited (WBSEDCL)")
    c.drawString(100, 700, "Consumer ID : 987654321")
    c.drawString(100, 680, "Name : Debraj Sen")
    c.drawString(100, 660, "Billing Period : May 2026")
    c.drawString(100, 640, "Units Consumed : 250")
    c.drawString(100, 620, "Net Payable Amount : ₹1650")
    c.drawString(100, 600, "Reading Status : ACTUAL")
    c.drawString(100, 580, "Due Date : 25-06-2026")
    c.drawString(100, 550, "Thank you for conservation!")
    c.save()
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    generate_pdf()
