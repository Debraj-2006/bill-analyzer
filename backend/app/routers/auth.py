from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import UserCreate, UserResponse, Token, OTPRequest, OTPVerify
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.database import get_database
from datetime import timedelta, datetime
from app.core.config import settings
from app.utils.otp import create_and_send_otp, verify_otp as check_otp, _normalize_mobile

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Email / Password Auth (existing)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    db = get_database()

    # Check duplicate email
    existing_email = await db["users"].find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check duplicate mobile (if provided)
    if user.mobile_number:
        mobile = _normalize_mobile(user.mobile_number)
        existing_mobile = await db["users"].find_one({"mobile_number": mobile})
        if existing_mobile:
            raise HTTPException(status_code=400, detail="Mobile number already registered")

    user_dict = user.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))

    # Normalise mobile
    if user_dict.get("mobile_number"):
        user_dict["mobile_number"] = _normalize_mobile(user_dict["mobile_number"])
    user_dict["phone_verified"] = False  # will be flipped when OTP is verified

    await db["users"].insert_one(user_dict)
    return UserResponse(
        email=user.email,
        name=user.name,
        mobile_number=user_dict.get("mobile_number"),
    )


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_database()
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "name": user.get("name", ""), "mobile": user.get("mobile_number", "")},
        expires_delta=access_token_expires,
    )
    # Log successful login
    await db["login_history"].insert_one({
        "user_id": user["email"],
        "login_method": "email",
        "timestamp": datetime.utcnow().isoformat(),
        "ip_address": None  # Could be added using Request object
    })

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        email=current_user["email"],
        name=current_user["name"],
        mobile_number=current_user.get("mobile_number"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Mobile OTP Auth (new)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/send-otp")
async def send_otp(payload: OTPRequest):
    """
    Send a 6-digit OTP to the provided mobile number.
    purpose="login"    → mobile must already have an account
    purpose="register" → mobile must NOT already have an account
    """
    db = get_database()
    mobile = _normalize_mobile(payload.mobile_number)

    if len(mobile) != 10 or not mobile.isdigit():
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number")

    existing = await db["users"].find_one({"mobile_number": mobile})

    if payload.purpose == "login" and not existing:
        raise HTTPException(
            status_code=404,
            detail="No account found with this mobile number. Please register first.",
        )

    if payload.purpose == "register" and existing:
        raise HTTPException(
            status_code=400,
            detail="Mobile number already registered. Please login instead.",
        )

    await create_and_send_otp(mobile, payload.purpose)
    return {"message": f"OTP sent to +91-{mobile}. Valid for {settings.OTP_EXPIRE_MINUTES} minutes."}


@router.post("/verify-otp")
async def verify_otp_endpoint(payload: OTPVerify):
    """
    Verify OTP.
    - purpose="login"    → returns JWT token on success.
    - purpose="register" → confirms phone is valid; frontend then calls /register.
    """
    db = get_database()
    mobile = _normalize_mobile(payload.mobile_number)

    is_valid = await check_otp(mobile, payload.otp, payload.purpose)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP. Please request a new one.",
        )

    if payload.purpose == "login":
        user = await db["users"].find_one({"mobile_number": mobile})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Mark phone as verified
        await db["users"].update_one(
            {"mobile_number": mobile},
            {"$set": {"phone_verified": True}},
        )

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": user["email"],
                "name": user.get("name", ""),
                "mobile": mobile,
            },
            expires_delta=access_token_expires,
        )
        # Log successful login
        await db["login_history"].insert_one({
            "user_id": mobile,
            "login_method": "otp",
            "timestamp": datetime.utcnow().isoformat(),
            "ip_address": None
        })

        return {"access_token": access_token, "token_type": "bearer", "verified": True}

    # purpose == "register" — just confirm the mobile is valid
    return {"verified": True, "mobile_number": mobile}
