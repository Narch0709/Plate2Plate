from typing import Literal
from pydantic import BaseModel, EmailStr, Field


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