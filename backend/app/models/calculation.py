from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


class ApplianceUsage(BaseModel):
    name: str
    wattage: float
    quantity: int
    hours_per_day: float


class CalculationBase(BaseModel):
    title: str
    appliances: List[ApplianceUsage]
    total_estimated_units: float
    estimated_monthly_cost: float


class CalculationCreate(CalculationBase):
    pass


class CalculationResponse(CalculationBase):
    id: str = Field(alias="_id")
    user_email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
