# backend/app/routers/offices.py — WBSEDCL offices list + nearby locator

import math
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_database
from app.core.security import settings
from typing import List, Optional
from bson import ObjectId
import jwt
from fastapi.security import OAuth2PasswordBearer

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


# Haversine formula to calculate the distance between two coordinates in km
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth radius in km

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# List of real/realistic WBSEDCL offices in West Bengal, India
SEED_OFFICES = [
    {
        "name": "Salt Lake Customer Care Center",
        "address": "DJ Block, Sector II, Bidhannagar, Kolkata, West Bengal 700091",
        "phone": "033-2359-1930",
        "district": "North 24 Parganas",
        "type": "Customer Care Center",
        "lat": 22.5867,
        "lng": 88.4176,
    },
    {
        "name": "Bidhannagar Divisional Office",
        "address": "Block-A, Sector-V, Salt Lake, Kolkata, West Bengal 700091",
        "phone": "033-2337-1425",
        "district": "North 24 Parganas",
        "type": "Divisional Office",
        "lat": 22.5726,
        "lng": 88.4344,
    },
    {
        "name": "Howrah Customer Care Center",
        "address": "102/1, Netaji Subhas Road, Howrah, West Bengal 711101",
        "phone": "033-2641-2856",
        "district": "Howrah",
        "type": "Customer Care Center",
        "lat": 22.5859,
        "lng": 88.3226,
    },
    {
        "name": "Siliguri Town Customer Care Center",
        "address": "Spencer Road, Ward 11, Siliguri, West Bengal 734001",
        "phone": "0353-2432-841",
        "district": "Darjeeling",
        "type": "Customer Care Center",
        "lat": 26.7153,
        "lng": 88.4239,
    },
    {
        "name": "Kharagpur Customer Care Center",
        "address": "Malancha Road, Kharagpur, West Bengal 721301",
        "phone": "03222-255-081",
        "district": "Paschim Medinipur",
        "type": "Customer Care Center",
        "lat": 22.3302,
        "lng": 87.3237,
    },
    {
        "name": "Burdwan Town Customer Care Center",
        "address": "GT Road, Kalibazar, Bardhaman, West Bengal 713101",
        "phone": "0342-2662-315",
        "district": "Purba Bardhaman",
        "type": "Customer Care Center",
        "lat": 23.2386,
        "lng": 87.8617,
    },
    {
        "name": "Durgapur City Customer Care Center",
        "address": "Non-Company Housing Area, Durgapur, West Bengal 713203",
        "phone": "0343-2564-282",
        "district": "Paschim Bardhaman",
        "type": "Customer Care Center",
        "lat": 23.5204,
        "lng": 87.3119,
    },
    {
        "name": "Kalyani Customer Care Center",
        "address": "B-Block, Kalyani, Nadia, West Bengal 741235",
        "phone": "033-2582-8432",
        "district": "Nadia",
        "type": "Customer Care Center",
        "lat": 22.9750,
        "lng": 88.4344,
    },
    {
        "name": "Barasat Customer Care Center",
        "address": "Jessore Road, Barasat, Kolkata, West Bengal 700124",
        "phone": "033-2562-4211",
        "district": "North 24 Parganas",
        "type": "Customer Care Center",
        "lat": 22.7234,
        "lng": 88.4811,
    },
    {
        "name": "Behala Customer Care Center",
        "address": "12, Diamond Harbour Rd, Behala, Kolkata, West Bengal 700034",
        "phone": "033-2446-9812",
        "district": "South 24 Parganas",
        "type": "Customer Care Center",
        "lat": 22.4983,
        "lng": 88.3182,
    },
    {
        "name": "Garia Customer Care Center",
        "address": "Raja SC Mullick Road, Garia, Kolkata, West Bengal 700084",
        "phone": "033-2435-0211",
        "district": "South 24 Parganas",
        "type": "Customer Care Center",
        "lat": 22.4632,
        "lng": 88.3792,
    },
    {
        "name": "Asansol Divisional Office",
        "address": "Srishti Plaza, Sen Raleigh Road, Asansol, West Bengal 713304",
        "phone": "0341-2254-211",
        "district": "Paschim Bardhaman",
        "type": "Divisional Office",
        "lat": 23.6889,
        "lng": 86.9749,
    },
    {
        "name": "Chinsurah Customer Care Center",
        "address": "Pipulpati, GT Road, Chinsurah, Hooghly, West Bengal 712103",
        "phone": "033-2680-2030",
        "district": "Hooghly",
        "type": "Customer Care Center",
        "lat": 22.9012,
        "lng": 88.3905,
    },
    {
        "name": "Serampore Customer Care Center",
        "address": "18, Grand Trunk Road, Serampore, Hooghly, West Bengal 712201",
        "phone": "033-2622-1045",
        "district": "Hooghly",
        "type": "Customer Care Center",
        "lat": 22.7507,
        "lng": 88.3432,
    },
    {
        "name": "Haldia Divisional Office",
        "address": "City Centre, Debhog, Haldia, Purba Medinipur, West Bengal 721657",
        "phone": "03224-252-022",
        "district": "Purba Medinipur",
        "type": "Divisional Office",
        "lat": 22.0620,
        "lng": 88.0694,
    },
    {
        "name": "Tamluk Customer Care Center",
        "address": "Padumbasan, Tamluk, Purba Medinipur, West Bengal 721636",
        "phone": "03228-266-031",
        "district": "Purba Medinipur",
        "type": "Customer Care Center",
        "lat": 22.2965,
        "lng": 87.9254,
    },
    {
        "name": "Malda Divisional Office",
        "address": "Rabindra Avenue, Malda Town, Malda, West Bengal 732101",
        "phone": "03512-252-035",
        "district": "Malda",
        "type": "Divisional Office",
        "lat": 25.0108,
        "lng": 88.1411,
    },
    {
        "name": "Berhampore Customer Care Center",
        "address": "26, GT Road, Khagra, Berhampore, Murshidabad, West Bengal 742101",
        "phone": "03482-252-054",
        "district": "Murshidabad",
        "type": "Customer Care Center",
        "lat": 24.0988,
        "lng": 88.2679,
    },
    {
        "name": "Bankura Customer Care Center",
        "address": "Lalbazar, Bankura Town, Bankura, West Bengal 722101",
        "phone": "03242-250-244",
        "district": "Bankura",
        "type": "Customer Care Center",
        "lat": 23.2324,
        "lng": 87.0722,
    },
    {
        "name": "Purulia Customer Care Center",
        "address": "Ranchi Road, Purulia Town, Purulia, West Bengal 723101",
        "phone": "03252-222-314",
        "district": "Purulia",
        "type": "Customer Care Center",
        "lat": 23.3321,
        "lng": 86.3654,
    },
    {
        "name": "Jalpaiguri Divisional Office",
        "address": "Club Road, Jalpaiguri Town, Jalpaiguri, West Bengal 735101",
        "phone": "03561-230-245",
        "district": "Jalpaiguri",
        "type": "Divisional Office",
        "lat": 26.5224,
        "lng": 88.7248,
    },
    {
        "name": "Cooch Behar Customer Care Center",
        "address": "Sunity Road, Cooch Behar, West Bengal 736101",
        "phone": "03582-222-243",
        "district": "Cooch Behar",
        "type": "Customer Care Center",
        "lat": 26.3249,
        "lng": 89.4475,
    },
    {
        "name": "Suri Customer Care Center",
        "address": "Suri Town, Birbhum, West Bengal 731101",
        "phone": "03462-255-624",
        "district": "Birbhum",
        "type": "Customer Care Center",
        "lat": 23.9108,
        "lng": 87.5276,
    },
    {
        "name": "Bolpur Customer Care Center",
        "address": "Bolpur Sriniketan Road, Bolpur, Birbhum, West Bengal 731204",
        "phone": "03463-252-441",
        "district": "Birbhum",
        "type": "Customer Care Center",
        "lat": 23.6682,
        "lng": 87.6834,
    },
]


async def seed_offices_if_empty():
    db = get_database()
    if db is None:
        print("Database not connected yet, skipping office seeding.")
        return
    count = await db["offices"].count_documents({})
    if count != len(SEED_OFFICES):
        print(f"Syncing offices collection: DB count ({count}) != local size ({len(SEED_OFFICES)}). Syncing...")
        await db["offices"].delete_many({})
        await db["offices"].insert_many(SEED_OFFICES)
        print(f"Successfully seeded/synchronized {len(SEED_OFFICES)} offices.")
    else:
        print(f"Offices collection already seeded and up-to-date ({count} records).")


@router.get("/public", response_model=List[dict])
async def list_public_offices(
    district: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
):
    db = get_database()
    query = {}

    if district:
        query["district"] = district
    if type:
        query["type"] = type
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"address": {"$regex": search, "$options": "i"}},
            {"district": {"$regex": search, "$options": "i"}},
        ]

    offices = await db["offices"].find(query).to_list(100)
    for office in offices:
        office["_id"] = str(office["_id"])
    return offices


@router.get("/", response_model=List[dict])
async def list_offices(
    district: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    email: str = Depends(get_current_user_email),
):
    db = get_database()
    query = {}

    if district:
        query["district"] = district
    if type:
        query["type"] = type
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"address": {"$regex": search, "$options": "i"}},
            {"district": {"$regex": search, "$options": "i"}},
        ]

    offices = await db["offices"].find(query).to_list(100)
    for office in offices:
        office["_id"] = str(office["_id"])
    return offices


@router.get("/nearby", response_model=List[dict])
async def get_nearby_offices(
    lat: float,
    lng: float,
    limit: int = 5,
    email: str = Depends(get_current_user_email),
):
    db = get_database()
    offices = await db["offices"].find({}).to_list(100)

    results = []
    for office in offices:
        office_lat = office.get("lat")
        office_lng = office.get("lng")
        if office_lat is not None and office_lng is not None:
            dist = calculate_distance(lat, lng, office_lat, office_lng)
            office["_id"] = str(office["_id"])
            office["distance_km"] = round(dist, 2)
            results.append(office)

    # Sort by closest distance
    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]
