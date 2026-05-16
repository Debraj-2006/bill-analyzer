import httpx
import asyncio

async def test_send_otp():
    url = "http://localhost:8000/api/v1/auth/send-otp"
    payload = {
        "email": "new_user_test@example.com",
        "purpose": "register"
    }
    print(f"Sending request to {url}...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=10.0)
            print(f"Status Code: {resp.status_code}")
            print(f"Response: {resp.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_send_otp())
