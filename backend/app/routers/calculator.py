from fastapi import APIRouter, Depends, HTTPException
from app.models.calculation import CalculationCreate, CalculationResponse
from app.database import get_database
from app.core.security import settings
from typing import List
from bson import ObjectId
import jwt
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime

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


@router.post("/", response_model=CalculationResponse)
async def create_calculation(calc: CalculationCreate, email: str = Depends(get_current_user_email)):
    db = get_database()
    calc_dict = calc.model_dump()
    calc_dict["user_email"] = email
    calc_dict["created_at"] = datetime.utcnow()

    result = await db["calculations"].insert_one(calc_dict)
    calc_dict["_id"] = str(result.inserted_id)
    return calc_dict


@router.get("/", response_model=List[CalculationResponse])
async def list_calculations(email: str = Depends(get_current_user_email)):
    db = get_database()
    calcs = await db["calculations"].find({"user_email": email}).to_list(100)
    for calc in calcs:
        calc["_id"] = str(calc["_id"])
    return calcs


@router.get("/{calc_id}", response_model=CalculationResponse)
async def get_calculation(calc_id: str, email: str = Depends(get_current_user_email)):
    db = get_database()
    calc = await db["calculations"].find_one({"_id": ObjectId(calc_id), "user_email": email})
    if not calc:
        raise HTTPException(status_code=404, detail="Calculation not found")
    calc["_id"] = str(calc["_id"])
    return calc


@router.delete("/{calc_id}")
async def delete_calculation(calc_id: str, email: str = Depends(get_current_user_email)):
    db = get_database()
    result = await db["calculations"].delete_one({"_id": ObjectId(calc_id), "user_email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Calculation not found")
    return {"message": "Calculation deleted successfully"}
