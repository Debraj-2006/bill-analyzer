from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import UserCreate, UserResponse, Token
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.database import get_database
from datetime import timedelta, datetime
from app.core.config import settings

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
        existing_mobile = await db["users"].find_one({"mobile_number": user.mobile_number})
        if existing_mobile:
            raise HTTPException(status_code=400, detail="Mobile number already registered")

    user_dict = user.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["email_verified"] = True  # Email is marked as verified by default

    await db["users"].insert_one(user_dict)
    return UserResponse(
        email=user.email,
        name=user.name,
        mobile_number=user_dict.get("mobile_number"),
        district=user_dict.get("district"),
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
        "ip_address": None
    })

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        email=current_user["email"],
        name=current_user["name"],
        mobile_number=current_user.get("mobile_number"),
        district=current_user.get("district"),
    )


from pydantic import BaseModel

class SSOLoginRequest(BaseModel):
    email: str
    name: str
    phone: str = ""
    timestamp: str
    hash: str

@router.post("/sso-login", response_model=Token)
async def sso_login(payload: SSOLoginRequest):
    import hashlib
    # Shared secret
    secret = "loksetu-shared-secret-key-2026"
    
    # Verify signature
    msg = f"{payload.email}:{payload.name}:{payload.phone}:{payload.timestamp}:{secret}"
    expected_hash = hashlib.sha256(msg.encode()).hexdigest()
    
    if payload.hash != expected_hash:
        raise HTTPException(status_code=400, detail="Invalid SSO signature")
        
    # Verify timestamp (5 minutes limit)
    try:
        ts = datetime.fromisoformat(payload.timestamp.replace('Z', '+00:00'))
        if ts.tzinfo is not None:
            ts = ts.astimezone(None).replace(tzinfo=None)
        diff = abs((datetime.now() - ts).total_seconds())
        if diff > 300:
            raise HTTPException(status_code=400, detail="SSO token has expired")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SSO timestamp validation error: {str(e)}")
        
    db = get_database()
    user = await db["users"].find_one({"email": payload.email})
    if not user:
        # Seamlessly auto-register user on first single sign-on link click!
        new_user = {
            "email": payload.email,
            "name": payload.name,
            "hashed_password": get_password_hash("loksetusso2026"),
            "mobile_number": payload.phone if payload.phone else None,
            "district": "Kolkata",
            "email_verified": True
        }
        await db["users"].insert_one(new_user)
        user = new_user
    else:
        # Seamlessly update name and mobile_number to stay perfectly in sync with LokSetu profile
        update_fields = {}
        if user.get("name") != payload.name:
            update_fields["name"] = payload.name
        if payload.phone and user.get("mobile_number") != payload.phone:
            update_fields["mobile_number"] = payload.phone
            
        if update_fields:
            await db["users"].update_one({"email": payload.email}, {"$set": update_fields})
            user = await db["users"].find_one({"email": payload.email})

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "name": user.get("name", ""), "mobile": user.get("mobile_number", "")},
        expires_delta=access_token_expires,
    )
    
    await db["login_history"].insert_one({
        "user_id": user["email"],
        "login_method": "sso_loksetu",
        "timestamp": datetime.utcnow().isoformat(),
        "ip_address": None
    })
    
    return {"access_token": access_token, "token_type": "bearer"}

