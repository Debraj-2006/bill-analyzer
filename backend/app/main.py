from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, bills, calculator, chat, insights

app = FastAPI(title="WBSEDCL Bill Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()


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

