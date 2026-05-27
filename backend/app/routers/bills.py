from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.database import get_database
from app.core.security import settings
from app.utils.parser import parse_wbsedcl_bill
from app.utils.tariff import calculate_wbsedcl_bill, calculate_cesc_bill, calculate_generic_bill
from app.utils.dispute import generate_dispute_letter
from typing import List
from bson import ObjectId
import jwt
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime
import os
import shutil

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


@router.post("/upload", response_model=dict)
async def upload_bill(file: UploadFile = File(...), email: str = Depends(get_current_user_email)):
    # Create temp file
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Check if file is image or PDF
        ext = file.filename.split('.')[-1].lower()
        if ext in ['jpg', 'jpeg', 'png']:
            raise HTTPException(
                status_code=400, 
                detail="Image parsing is currently in beta. Please upload a PDF for the most accurate results."
            )
        
        # Parse
        parsed_data = parse_wbsedcl_bill(temp_path)

        # Analyze
        if parsed_data.get("units_consumed") is not None:
            provider = parsed_data.get("provider", "WBSEDCL")
            billed_months = parsed_data.get("billed_months", 1)
            
            # Route to the appropriate tariff calculator
            if provider == "CESC":
                analysis = calculate_cesc_bill(parsed_data["units_consumed"], months=billed_months)
            elif provider == "WBSEDCL":
                analysis = calculate_wbsedcl_bill(parsed_data["units_consumed"], months=billed_months)
            else:
                analysis = calculate_generic_bill(parsed_data["units_consumed"], months=billed_months)
                
            parsed_data["analysis"] = analysis

            # Incorporate adjustments and rebates to avoid false discrepancy warnings
            adjustments = parsed_data.get("adjustments", 0.0)
            rebate = parsed_data.get("rebate", 0.0)
            expected_total = analysis["total_amount"] + adjustments - rebate
            parsed_data["expected_amount"] = round(expected_total, 2)

            # Detect discrepancy
            if parsed_data.get("total_amount") is not None:
                discrepancy = abs(parsed_data["total_amount"] - expected_total)
                parsed_data["has_error"] = discrepancy > 10.0  # Error threshold
            else:
                parsed_data["has_error"] = False
        else:
             parsed_data["has_error"] = False

        # Save to DB
        db = get_database()
        bill_record = {
            **parsed_data,
            "filename": file.filename,
            "user_email": email,
            "created_at": datetime.utcnow()
        }
        result = await db["bills"].insert_one(bill_record)
        bill_record["_id"] = str(result.inserted_id)

        return bill_record

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process bill: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/", response_model=List[dict])
async def list_bills(email: str = Depends(get_current_user_email)):
    db = get_database()
    bills = await db["bills"].find({"user_email": email}).to_list(100)
    for bill in bills:
        bill["_id"] = str(bill["_id"])
    return bills


@router.get("/{bill_id}")
async def get_bill(bill_id: str, email: str = Depends(get_current_user_email)):
    db = get_database()
    bill = await db["bills"].find_one({"_id": ObjectId(bill_id), "user_email": email})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    bill["_id"] = str(bill["_id"])
    return bill


@router.get("/{bill_id}/dispute")
async def get_dispute_letter_api(bill_id: str, email: str = Depends(get_current_user_email)):
    db = get_database()
    bill = await db["bills"].find_one({"_id": ObjectId(bill_id), "user_email": email})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    reason = "Discrepancy in units calculation and tariff slab application."
    if bill.get("is_estimated"):
        reason = "The bill is based on an estimated reading, which is significantly higher than actual consumption."

    pdf_bytes = generate_dispute_letter(bill, reason)

    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=dispute_{bill_id}.pdf"}
    )


@router.delete("/{bill_id}")
async def delete_bill(bill_id: str, email: str = Depends(get_current_user_email)):
    db = get_database()
    result = await db["bills"].delete_one({"_id": ObjectId(bill_id), "user_email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"message": "Bill deleted successfully"}
