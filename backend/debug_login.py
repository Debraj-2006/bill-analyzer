import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import bcrypt

load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL")


async def check():
    try:
        print("Connecting to MongoDB...")
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        db = client["bill_analyzer_db"]

        users = await db["users"].find().to_list(10)
        print(f"Total users found: {len(users)}")

        for u in users:
            email = u.get("email", "N/A")
            has_hp = "hashed_password" in u
            hp = u.get("hashed_password", "")
            hp_type = type(hp).__name__
            hp_valid = str(hp).startswith("$2b$") or str(hp).startswith("$2a$")
            print(f"  email={email}, has_hashed_password={has_hp}, type={hp_type}, bcrypt_format={hp_valid}")

            # Test verify with a known password
            if has_hp:
                try:
                    test_hash = hp.encode("utf-8") if isinstance(hp, str) else hp
                    # This will fail as we don't know the password, but we can
                    # check the hash is well-formed
                    bcrypt.checkpw(b"wrongpassword", test_hash)
                    print("  Hash is well-formed (bcrypt format OK)")
                except Exception as e:
                    print(f"  Hash check error: {e}")

    except Exception as e:
        print(f"Connection/query Error: {e}")

asyncio.run(check())
