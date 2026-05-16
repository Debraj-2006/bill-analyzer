import sys
import os
import asyncio

# Add current dir to path to find 'app'
sys.path.append(os.getcwd())

from app.utils.otp import send_otp_email
from app.core.config import settings

async def test():
    print(f"Testing with GMAIL_USER: '{settings.GMAIL_USER}'")
    result = await send_otp_email("test@example.com", "123456")
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(test())
