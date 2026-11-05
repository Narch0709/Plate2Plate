from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session
from routers import admin, claims, listings

from database import get_db
from deps import get_current_user, require_role
from models import User
from schemas import Token, UserCreate, UserOut
from security import create_access_token, hash_password, verify_password

app = FastAPI(title="Plate2Plate API")
app.include_router(admin.router)
app.include_router(listings.router)
app.include_router(claims.router)

@app.get("/")
def home():
    return {"message": "Plate2Plate API is running"}


@app.post("/auth/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=data.name,
        email=email,
        password_hash=hash_password(data.password),
        role=data.role,
        phone=data.phone,
        org_name=data.org_name,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        is_verified=(data.role == "donor"),  # NGOs wait for admin approval
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return Token(access_token=create_access_token(user.id, user.role))


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user

