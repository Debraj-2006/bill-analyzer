from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

async def check_local_db():
    try:
        url = "mongodb://localhost:27017"
        print(f"Connecting to: {url}")
        client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=2000)
        # force connection
        await client.admin.command('ping')
        print("Connected successfully to local MongoDB")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(check_local_db())
