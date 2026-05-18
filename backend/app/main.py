from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, bills, calculator, chat, insights, offices

app = FastAPI(title="WBSEDCL Bill Analyzer API")

import os

# Allow localhost in dev, plus any Vercel deployment in production
_frontend_url = os.getenv("FRONTEND_URL", "")
_allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://loksetu-5d56c.web.app",
    "https://wbsedcl-bill-analyzer.web.app",
    "https://wbsedcl-bill-analyzer.firebaseapp.com",
]
if _frontend_url and _frontend_url not in _allowed_origins:
    _allowed_origins.append(_frontend_url)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    await offices.seed_offices_if_empty()


@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()


@app.get("/")
async def root():
    return {"message": "Welcome to WBSEDCL Bill Analyzer API"}

app.include_router(auth.router,       prefix="/api/v1/auth",       tags=["auth"])
app.include_router(bills.router,      prefix="/api/v1/bills",      tags=["bills"])
app.include_router(calculator.router, prefix="/api/v1/calculator", tags=["calculator"])
app.include_router(chat.router,       prefix="/api/v1/chat",       tags=["chat"])
app.include_router(insights.router,   prefix="/api/v1/insights",   tags=["insights"])
app.include_router(offices.router,    prefix="/api/v1/offices",    tags=["offices"])


