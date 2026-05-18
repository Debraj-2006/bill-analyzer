from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    mobile_number: str
    district: Optional[str] = None


class UserInDB(UserCreate):
    hashed_password: str


class UserResponse(BaseModel):
    email: EmailStr
    name: str
    mobile_number: str
    district: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class OTPRequest(BaseModel):
    email: EmailStr
    purpose: str = "register"  # "register" or "login"


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str
    purpose: str = "register"  # "register" or "login"


class LoginRecord(BaseModel):
    user_id: str  # Email
    login_method: str  # "email" or "otp"
    timestamp: str
    ip_address: Optional[str] = None
