from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def check_bills():
    try:
        url = os.getenv("MONGODB_URL")
        db_name = os.getenv("DATABASE_NAME")
        print(f"Connecting to MongoDB at {url}...")
        client = AsyncIOMotorClient(url)
        db = client[db_name]
        
        # Check bills
        bills = await db["bills"].find().to_list(100)
        print(f"\n--- Found {len(bills)} Bills in DB ---")
        for idx, bill in enumerate(bills):
            print(f"\n[Bill {idx+1}]")
            for k, v in bill.items():
                if k != "_id":
                    print(f"  {k}: {v}")
                else:
                    print(f"  _id: {str(v)}")
        
        # Check users
        users = await db["users"].find().to_list(100)
        print(f"\n--- Found {len(users)} Users in DB ---")
        for user in users:
            print(f"  Email: {user.get('email')}, Name: {user.get('name')}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_bills())
