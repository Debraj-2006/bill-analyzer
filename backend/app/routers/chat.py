# app/routers/chat.py — AI Chatbot endpoint powered by Claude (Anthropic)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import anthropic
import os

router = APIRouter()

# ── Anthropic client ────────────────────────────────────────────────────────────
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

# ── Full Platform System Prompt ─────────────────────────────────────────────────
SYSTEM_PROMPT = """You are BillBot, the friendly AI assistant built into the WBSEDCL Bill Analyzer platform.
You help West Bengal electricity consumers understand their bills, use the platform features, and resolve billing issues.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ABOUT THE WBSEDCL BILL ANALYZER PLATFORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is a full-stack web application (React + FastAPI) that helps WBSEDCL consumers:
1. Upload and AI-analyze their electricity bills for errors
2. Calculate expected bills using an Appliance Calculator
3. Generate official Dispute Letters when overcharged
4. Track billing history via a personal Dashboard
5. Chat with you (BillBot) for expert guidance

KEY FEATURES (explain these when users ask "what does this website do" or "features"):

📤 UPLOAD BILL (page: /upload)
   - Upload WBSEDCL bill as PDF or image
   - AI extracts all data automatically (units, charges, dates)
   - Compares each charge against official WBERC tariff rates
   - Flags overcharges, incorrect FSC, wrong slab calculations
   - Shows a detailed audit report with correct vs billed amounts

📊 BILL ANALYSIS (page: /bills/:id)
   - Full breakdown: energy charge, fixed charge, FSC, state duty, meter rent
   - Visual charts showing consumption trends over months
   - Overcharge detection with exact ₹ difference highlighted
   - One-click button to generate a Dispute Letter if errors found

🧮 APPLIANCE CALCULATOR (page: /calculator)
   - Add home appliances (AC, fridge, TV, fan, geyser, etc.)
   - Enter usage hours per day
   - Instantly calculates expected monthly units and bill amount
   - Helps you verify if WBSEDCL's reading is realistic

📝 DISPUTE LETTER GENERATOR (page: /bills/:id/dispute)
   - Generates a professionally worded official dispute letter
   - Pre-filled with your bill details, calculated errors, and legal references
   - Downloadable as PDF — ready to submit to WBSEDCL office
   - Cites Electricity Act 2003 and WBERC regulations

📈 DASHBOARD (page: /dashboard)
   - Personal history of all uploaded bills
   - Monthly consumption graph
   - Total overcharge detected across all bills
   - Quick links to re-analyze or dispute any past bill

🔐 AUTH (pages: /login, /register)
   - Secure registration with email + phone verification via OTP
   - JWT-based session management
   - Phone number verified via Twilio SMS OTP

🤖 BILLBOT (this chat — page: /chat)
   - AI assistant for all WBSEDCL queries
   - Voice/Audio mode: speak your question, hear the answer
   - Knows tariff slabs, billing rules, consumer rights
   - Works without Anthropic key via smart rule-based fallback

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WBSEDCL TARIFF KNOWLEDGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LT-B Domestic Tariff Slabs (WBERC approved):
  • 0–100 units:    ₹5.00/unit
  • 101–200 units:  ₹6.00/unit
  • 201–300 units:  ₹6.50/unit
  • Above 300 units: ₹7.00/unit

Fixed Charges (monthly):
  • Single phase: ₹25–₹50 depending on load
  • Three phase: ₹80–₹150 depending on load

Other Charges:
  • FSC (Fuel Surcharge): varies monthly, applied on energy charge
  • State Duty: 5% on (energy charge + fixed charge)
  • Meter Rent: ₹10–₹25/month

Billing cycle: Bi-monthly or monthly depending on division.
Estimated bills are marked 'E' — consumers can demand actual reading.

Consumer Rights:
  • Right to actual meter reading every billing cycle
  • Right to dispute within 30 days of receiving bill
  • WBSEDCL must respond to disputes within 30 days (Electricity Act 2003)
  • Helpline: 19121 | Website: www.wbsedcl.in

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PERSONALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Friendly, warm, and concise — like a knowledgeable neighbor
- Use ₹ for currency (never Rs.)
- Give specific numbers when helpful
- Keep answers under 200 words unless calculation needed
- Use simple language — many users are not tech-savvy
- If asked something outside electricity/platform scope, gently redirect
- Always be honest if unsure"""


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


@router.post("/")
async def chat(request: ChatRequest):
    """Send a message to the AI chatbot and get a response."""
    if not client.api_key:
        return {"reply": get_fallback_response(request.messages[-1].content if request.messages else "")}

    try:
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
            if msg.role in ("user", "assistant")
        ]

        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=messages,
        )

        reply = response.content[0].text
        return {"reply": reply}

    except anthropic.AuthenticationError:
        return {"reply": get_fallback_response(request.messages[-1].content if request.messages else "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


# ── Smart rule-based fallback (works without API key) ──────────────────────────
def get_fallback_response(user_message: str) -> str:
    msg = user_message.lower()

    # What does this website do / features
    if any(w in msg for w in ["website", "platform", "app", "features", "what is", "what does", "work", "purpose", "about"]):
        return ("🌐 **WBSEDCL Bill Analyzer — What it does:**\n\n"
                "This platform helps West Bengal electricity consumers:\n\n"
                "• 📤 **Upload Bill** — Upload your WBSEDCL PDF bill. Our AI reads every charge and checks it against official WBERC tariff rates\n"
                "• 📊 **Bill Analysis** — See a full audit: which charges are correct, which are overcharged, and by exactly how much\n"
                "• 🧮 **Appliance Calculator** — Enter your appliances & usage hours to calculate your expected bill and verify WBSEDCL's reading\n"
                "• 📝 **Dispute Letter** — Generate a ready-to-submit official dispute letter (PDF) if errors are found in your bill\n"
                "• 📈 **Dashboard** — Track all your uploaded bills, consumption trends, and total overcharges detected\n"
                "• 🤖 **BillBot (me!)** — Ask questions anytime, by text or voice\n\n"
                "Start by uploading your latest WBSEDCL bill! 📄")

    # Upload / how to start
    if any(w in msg for w in ["upload", "how to start", "get started", "begin", "start"]):
        return ("📤 **How to get started:**\n\n"
                "1. **Register** with your email & verify your phone via OTP\n"
                "2. Go to **Upload Bill** in the top menu\n"
                "3. Upload your WBSEDCL bill (PDF or image)\n"
                "4. Our AI analyzes it in seconds and shows a full audit report\n"
                "5. If overcharged, click **Generate Dispute Letter** in one click!\n\n"
                "Your bill data is saved to your Dashboard for future reference. 📈")

    # Calculator
    if any(w in msg for w in ["calculator", "appliance", "fridge", "ac", "fan", "calculate", "consumption"]):
        return ("🧮 **Appliance Calculator:**\n\n"
                "Go to **Calculator** in the top menu. You can:\n\n"
                "• Add appliances (AC, fridge, TV, fan, geyser, etc.)\n"
                "• Enter how many hours per day you use each\n"
                "• See your **expected monthly units** and **estimated bill**\n\n"
                "This helps you check if WBSEDCL's reading matches your actual usage. "
                "If their reading is much higher, you may have a billing error!")

    # Dispute letter
    if any(w in msg for w in ["dispute", "complaint", "wrong", "error", "overcharge", "letter", "appeal"]):
        return ("📝 **Dispute Letter Generator:**\n\n"
                "After your bill is analyzed:\n"
                "1. If overcharges are found, click **Generate Dispute Letter**\n"
                "2. A professionally worded letter is created with your details, the exact errors found, and legal references (Electricity Act 2003)\n"
                "3. Download as PDF and submit to your **local WBSEDCL division office**\n"
                "4. Keep a copy with the receipt\n"
                "5. WBSEDCL must respond within **30 days** by law\n\n"
                "Helpline: **19121** | Office locator: www.wbsedcl.in")

    # Dashboard
    if any(w in msg for w in ["dashboard", "history", "past bill", "previous", "track"]):
        return ("📈 **Your Dashboard:**\n\n"
                "The Dashboard shows:\n"
                "• All your previously uploaded & analyzed bills\n"
                "• Monthly consumption chart (track trends)\n"
                "• Total overcharges detected across all bills\n"
                "• Quick links to re-analyze or dispute any bill\n\n"
                "Go to **Dashboard** in the top navigation to view it.")

    # Tariff / rates
    if any(w in msg for w in ["tariff", "rate", "slab", "unit", "per unit", "charge"]):
        return ("📊 **WBSEDCL LT-B (Domestic) Tariff Slabs:**\n\n"
                "• 0–100 units: **₹5.00/unit**\n"
                "• 101–200 units: **₹6.00/unit**\n"
                "• 201–300 units: **₹6.50/unit**\n"
                "• Above 300 units: **₹7.00/unit**\n\n"
                "Plus **5% State Duty** + **Fuel Surcharge (FSC)** on top.\n"
                "FSC varies monthly — check your bill's front page for the current rate.")

    # Estimated reading
    if any(w in msg for w in ["estimated", "estimate", "meter", "reading", "actual"]):
        return ("⚠️ **About Estimated Bills:**\n\n"
                "If WBSEDCL estimates your reading (marked 'E' on bill) instead of taking an actual reading:\n\n"
                "• You have the right to demand an **actual meter reading**\n"
                "• You can submit your own reading via the WBSEDCL app\n"
                "• Overcharges from estimated readings are **fully refundable**\n"
                "• Use our **Dispute Letter** generator to formally request re-assessment")

    # Savings
    if any(w in msg for w in ["save", "reduce", "lower", "high bill", "too much", "expensive"]):
        return ("💡 **Tips to reduce your electricity bill:**\n\n"
                "• Use a **5-star rated AC** (saves ~30% vs 1-star)\n"
                "• Set AC to **24°C** — each degree lower adds ~6% to cost\n"
                "• Replace old bulbs with **LED lights**\n"
                "• Unplug devices on standby (they use 5-10% of total power)\n"
                "• Run washing machine with **full loads only**\n"
                "• Try to stay under **100 units/month** for the cheapest slab rate!\n\n"
                "Use our **Appliance Calculator** to find your biggest power users. 🧮")

    # Greeting / help
    if any(w in msg for w in ["hi", "hello", "hey", "namaste", "good morning", "good evening", "help"]):
        return ("👋 **Hi! I'm BillBot**, your WBSEDCL Bill Analyzer assistant!\n\n"
                "I can help you with:\n"
                "• 🌐 How to use this platform & all its features\n"
                "• 📊 Understanding tariff slabs & charges\n"
                "• ⚠️ Identifying & disputing billing errors\n"
                "• 🧮 Explaining the Appliance Calculator\n"
                "• 💡 Tips to reduce your bill\n\n"
                "You can also **switch to Audio Mode** 🎤 and just speak your question!\n\n"
                "What would you like to know?")

    # Default
    return ("🤔 I'm your **WBSEDCL Bill Analyzer assistant**! Ask me about:\n\n"
            "• What this platform does & its features\n"
            "• Tariff rates & slab calculations\n"
            "• How to spot & dispute billing errors\n"
            "• Using the Appliance Calculator\n"
            "• Consumer rights under the Electricity Act 2003\n"
            "• Tips to reduce your electricity bill\n\n"
            "*(Tip: Switch to 🎤 Audio Mode to speak your questions!)*")
