import os
import sys
import pdfplumber

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.parser import parse_wbsedcl_bill

def test_file(file_path):
    print("=" * 60)
    print(f"Testing parsing for: {file_path}")
    if not os.path.exists(file_path):
        print("File does not exist!")
        return

    # Check size
    size_mb = os.path.getsize(file_path) / (1024 * 1024)
    print(f"File size: {size_mb:.2f} MB")

    # Extract text and print first 1000 chars and length
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            print(f"Number of pages: {len(pdf.pages)}")
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                print(f"Page {i+1} extracted text length: {len(page_text)}")
                text += page_text + "\n"
    except Exception as e:
        print(f"Error reading with pdfplumber: {e}")

    print("-" * 40)
    print(f"Total extracted text length: {len(text)}")
    if text.strip():
        print("First 1000 characters of extracted text:")
        print(text[:1000])
        print("..." if len(text) > 1000 else "")
    else:
        print("WARNING: Extracted text is completely EMPTY!")

    # Parse and print results
    parsed = parse_wbsedcl_bill(file_path)
    print("-" * 40)
    print("Parsed results:")
    for k, v in parsed.items():
        print(f"  {k}: {v}")
    print("=" * 60)

if __name__ == "__main__":
    test_file(r"C:\Users\DEBRAJ\Desktop\Electric Bill_1.pdf")
    test_file(r"C:\Users\DEBRAJ\Desktop\bill.pdf")
