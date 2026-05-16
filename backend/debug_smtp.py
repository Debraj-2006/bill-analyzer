import sys
import os

# Assume running from 'backend' directory
from app.core.config import settings

print(f"GMAIL_USER: '{settings.GMAIL_USER}'")
print(f"GMAIL_APP_PASSWORD: '{settings.GMAIL_APP_PASSWORD}'")

is_placeholder = settings.GMAIL_USER in ["your-gmail@gmail.com", "debug", ""]
print(f"Is Placeholder: {is_placeholder}")
