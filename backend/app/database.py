from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import certifi

client = None
db = None


async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
    db = client[settings.DATABASE_NAME]
    print(f"Connected to MongoDB at {settings.MONGODB_URL}")


async def close_mongo_connection():
    if client:
        client.close()
        print("Closed MongoDB connection")


def get_database():
    return db
