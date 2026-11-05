from typing import Literal
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["ngo", "donor"]
    phone: str | None = None
    org_name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    org_name: str | None
    is_verified: bool

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ListingCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    food_type: str = Field(max_length=50)
    description: str | None = None
    quantity_servings: int = Field(gt=0)
    address: str = Field(max_length=300)
    latitude: float | None = None
    longitude: float | None = None
    prepared_at: datetime | None = None
    safe_until: datetime


class ListingOut(BaseModel):
    id: int
    donor_id: int
    title: str
    food_type: str
    description: str | None
    quantity_servings: int
    address: str
    latitude: float | None
    longitude: float | None
    safe_until: datetime
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ClaimOut(BaseModel):
    id: int
    listing_id: int
    ngo_id: int
    status: str
    cancel_reason: str | None
    claimed_at: datetime
    picked_up_at: datetime | None
    delivered_at: datetime | None

    model_config = {"from_attributes": True}


class OtpVerify(BaseModel):
    otp: str = Field(min_length=6, max_length=6)


class OtpOut(BaseModel):
    otp: str
    expires_at: datetime