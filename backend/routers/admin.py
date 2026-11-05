from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from deps import require_role
from models import User
from schemas import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ngos/pending", response_model=list[UserOut])
def pending_ngos(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    stmt = select(User).where(User.role == "ngo", User.is_verified.is_(False))
    return db.scalars(stmt).all()


@router.post("/ngos/{ngo_id}/approve", response_model=UserOut)
def approve_ngo(
    ngo_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    ngo = db.get(User, ngo_id)
    if not ngo or ngo.role != "ngo":
        raise HTTPException(status_code=404, detail="NGO not found")
    ngo.is_verified = True
    db.commit()
    db.refresh(ngo)
    return ngo