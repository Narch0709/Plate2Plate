import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from deps import require_role
from models import Claim, FoodListing, StatusEvent, User
from schemas import ClaimOut, OtpOut, OtpVerify
from security import hash_password, verify_password

router = APIRouter(prefix="/claims", tags=["claims"])

OTP_VALID_MINUTES = 10
MAX_OTP_ATTEMPTS = 5


def now() -> datetime:
    return datetime.now(timezone.utc)


def verified_ngo(user: User = Depends(require_role("ngo"))) -> User:
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Your NGO is waiting for admin approval")
    return user


def log_event(db: Session, listing: FoodListing, actor: User, status: str, note: str | None = None):
    """Change the listing status and record it in the audit log."""
    listing.status = status
    db.add(
        StatusEvent(
            entity_type="listing",
            entity_id=listing.id,
            status=status,
            actor_id=actor.id,
            note=note,
        )
    )


def get_ngo_claim(db: Session, claim_id: int, ngo: User) -> Claim:
    claim = db.get(Claim, claim_id)
    if not claim or claim.ngo_id != ngo.id:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim


@router.get("/mine", response_model=list[ClaimOut])
def my_claims(db: Session = Depends(get_db), ngo: User = Depends(verified_ngo)):
    stmt = select(Claim).where(Claim.ngo_id == ngo.id).order_by(Claim.claimed_at.desc())
    return db.scalars(stmt).all()


@router.get("/incoming", response_model=list[ClaimOut])
def incoming_claims(db: Session = Depends(get_db), donor: User = Depends(require_role("donor"))):
    stmt = (
        select(Claim)
        .join(FoodListing, Claim.listing_id == FoodListing.id)
        .where(FoodListing.donor_id == donor.id)
        .order_by(Claim.claimed_at.desc())
    )
    return db.scalars(stmt).all()


@router.post("/listing/{listing_id}", response_model=ClaimOut, status_code=201)
def claim_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    ngo: User = Depends(verified_ngo),
):
    # FOR UPDATE locks this row, so two NGOs clicking at the same moment
    # cannot both claim the same food.
    listing = db.scalar(select(FoodListing).where(FoodListing.id == listing_id).with_for_update())
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status != "available":
        raise HTTPException(status_code=409, detail="This food was already claimed or is no longer available")
    if listing.safe_until <= now():
        raise HTTPException(status_code=400, detail="This food is past its safe-until time")

    claim = Claim(listing_id=listing.id, ngo_id=ngo.id)
    db.add(claim)
    log_event(db, listing, ngo, "claimed")
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{claim_id}/start", response_model=ClaimOut)
def start_pickup(claim_id: int, db: Session = Depends(get_db), ngo: User = Depends(verified_ngo)):
    claim = get_ngo_claim(db, claim_id, ngo)
    listing = db.get(FoodListing, claim.listing_id)
    if claim.status != "active" or listing.status != "claimed":
        raise HTTPException(status_code=400, detail="Cannot start pickup right now")
    log_event(db, listing, ngo, "in_transit")
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{claim_id}/otp", response_model=OtpOut)
def generate_otp(claim_id: int, db: Session = Depends(get_db), donor: User = Depends(require_role("donor"))):
    claim = db.get(Claim, claim_id)
    listing = db.get(FoodListing, claim.listing_id) if claim else None
    if not claim or not listing or listing.donor_id != donor.id:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status != "active" or listing.status not in ("claimed", "in_transit"):
        raise HTTPException(status_code=400, detail="A handover code can't be created right now")

    otp = f"{secrets.randbelow(1_000_000):06d}"
    claim.otp_hash = hash_password(otp)  # only the hash is stored
    claim.otp_expires_at = now() + timedelta(minutes=OTP_VALID_MINUTES)
    claim.otp_attempts = 0
    db.commit()
    return OtpOut(otp=otp, expires_at=claim.otp_expires_at)


@router.post("/{claim_id}/verify-pickup", response_model=ClaimOut)
def verify_pickup(
    claim_id: int,
    data: OtpVerify,
    db: Session = Depends(get_db),
    ngo: User = Depends(verified_ngo),
):
    claim = get_ngo_claim(db, claim_id, ngo)
    listing = db.get(FoodListing, claim.listing_id)
    if claim.status != "active" or listing.status != "in_transit":
        raise HTTPException(status_code=400, detail="Start the pickup first")
    if not claim.otp_hash or not claim.otp_expires_at or claim.otp_expires_at < now():
        raise HTTPException(status_code=400, detail="No valid code. Ask the donor to generate a new one")
    if claim.otp_attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many wrong attempts. Ask the donor for a new code")

    if not verify_password(data.otp, claim.otp_hash):
        claim.otp_attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect code")

    claim.otp_hash = None
    claim.otp_expires_at = None
    claim.picked_up_at = now()
    log_event(db, listing, ngo, "picked_up")
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{claim_id}/deliver", response_model=ClaimOut)
def deliver(claim_id: int, db: Session = Depends(get_db), ngo: User = Depends(verified_ngo)):
    claim = get_ngo_claim(db, claim_id, ngo)
    listing = db.get(FoodListing, claim.listing_id)
    if claim.status != "active" or listing.status != "picked_up":
        raise HTTPException(status_code=400, detail="Food must be picked up before it is delivered")
    claim.status = "completed"
    claim.delivered_at = now()
    log_event(db, listing, ngo, "delivered")
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{claim_id}/cancel", response_model=ClaimOut)
def cancel_claim(
    claim_id: int,
    reason: str | None = None,
    db: Session = Depends(get_db),
    ngo: User = Depends(verified_ngo),
):
    claim = get_ngo_claim(db, claim_id, ngo)
    listing = db.get(FoodListing, claim.listing_id)
    if claim.status != "active" or listing.status not in ("claimed", "in_transit"):
        raise HTTPException(status_code=400, detail="Too late to cancel this claim")

    claim.status = "cancelled"
    claim.cancel_reason = reason or "Cancelled by NGO"
    claim.otp_hash = None
    claim.otp_expires_at = None
    # Put the food back for other NGOs, unless it has expired meanwhile
    new_status = "available" if listing.safe_until > now() else "expired"
    log_event(db, listing, ngo, new_status, note=f"Claim cancelled: {claim.cancel_reason}")
    db.commit()
    db.refresh(claim)
    return claim