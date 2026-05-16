from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    mobile_number: Optional[str] = None


class UserInDB(UserCreate):
    hashed_password: str


class UserResponse(BaseModel):
    email: EmailStr
    name: str
    mobile_number: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class OTPRequest(BaseModel):
    mobile_number: str
    purpose: str = "login"  # "login" or "register"


class OTPVerify(BaseModel):
    mobile_number: str
    otp: str
    purpose: str = "login"  # "login" or "register"


class LoginRecord(BaseModel):
    user_id: str  # Email or Mobile
    login_method: str  # "email" or "otp"
    timestamp: str
    ip_address: Optional[str] = None
