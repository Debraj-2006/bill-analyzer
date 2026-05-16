from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def check_db():
    try:
        url = os.getenv("MONGODB_URL")
        print(f"Connecting to: {url}")
        client = AsyncIOMotorClient(url)
        db = client[os.getenv("DATABASE_NAME")]
        users = await db["users"].find().to_list(100)
        print(f"Found {len(users)} users.")
        for user in users:
            print(f"User: {user.get('email')}")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(check_db())
