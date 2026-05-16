"""Quick test: hit Fast2SMS API and print full response."""
import httpx
import asyncio

API_KEY = "meWCwjx3Y4EyApsbKXluFoiBV28TPDU1Gq5hS0gaZ7NOz69rJvfR4HCKNyJTbnp36li0gadXjxMEBcmF"
TEST_NUMBER = "9999999999"   # dummy number — just for API key validation
OTP = "123456"


async def test_fast2sms():
    url = "https://www.fast2sms.com/dev/bulkV2"
    headers = {"authorization": API_KEY}
    payload = {
        "route": "otp",
        "variables_values": OTP,
        "flash": 0,
        "numbers": TEST_NUMBER,
    }
    print(f"Sending POST to {url}")
    print(f"Payload: {payload}")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            print(f"\nStatus Code : {resp.status_code}")
            print(f"Response    : {resp.text}")
    except Exception as e:
        print(f"\nEXCEPTION: {e}")


asyncio.run(test_fast2sms())
