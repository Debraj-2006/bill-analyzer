from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BillBase(BaseModel):
    consumer_id: str
    consumer_name: str
    billing_period: str
    units_consumed: float
    total_amount: float
    due_date: datetime
    is_estimated: bool = False


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    consumer_name: Optional[str] = None
    units_consumed: Optional[float] = None
    total_amount: Optional[float] = None
    due_date: Optional[datetime] = None
    is_estimated: Optional[bool] = None


class BillResponse(BillBase):
    id: str = Field(alias="_id")
    user_email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
