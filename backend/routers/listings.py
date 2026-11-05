from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from deps import require_role
from models import Claim, FoodListing, StatusEvent, User
from schemas import ListingCreate, ListingOut

router = APIRouter(prefix="/listings", tags=["listings"])


def as_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


@router.post("", response_model=ListingOut, status_code=201)
def create_listing(
    data: ListingCreate,
    db: Session = Depends(get_db),
    donor: User = Depends(require_role("donor")),
):
    safe_until = as_utc(data.safe_until)
    if safe_until <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="safe_until must be in the future")

    listing = FoodListing(
        donor_id=donor.id,
        title=data.title,
        food_type=data.food_type,
        description=data.description,
        quantity_servings=data.quantity_servings,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        prepared_at=data.prepared_at,
        safe_until=safe_until,
    )
    db.add(listing)
    db.flush()
    db.add(StatusEvent(entity_type="listing", entity_id=listing.id, status="available", actor_id=donor.id))
    db.commit()
    db.refresh(listing)
    return listing


@router.get("", response_model=list[ListingOut])
def available_listings(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("ngo", "admin")),
):
    if user.role == "ngo" and not user.is_verified:
        raise HTTPException(status_code=403, detail="Your NGO is waiting for admin approval")
    stmt = (
        select(FoodListing)
        .where(FoodListing.status == "available", FoodListing.safe_until > datetime.now(timezone.utc))
        .order_by(FoodListing.created_at.desc())
    )
    return db.scalars(stmt).all()


@router.get("/mine", response_model=list[ListingOut])
def my_listings(
    db: Session = Depends(get_db),
    donor: User = Depends(require_role("donor")),
):
    stmt = select(FoodListing).where(FoodListing.donor_id == donor.id).order_by(FoodListing.created_at.desc())
    return db.scalars(stmt).all()


@router.post("/{listing_id}/cancel", response_model=ListingOut)
def cancel_listing(
    listing_id: int,
    reason: str | None = None,
    db: Session = Depends(get_db),
    donor: User = Depends(require_role("donor")),
):
    listing = db.get(FoodListing, listing_id)
    if not listing or listing.donor_id != donor.id:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status not in ("available", "claimed"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a listing that is {listing.status}")

    claim = db.scalar(select(Claim).where(Claim.listing_id == listing.id, Claim.status == "active"))
    if claim:
        claim.status = "cancelled"
        claim.cancel_reason = reason or "Cancelled by donor"

    listing.status = "cancelled"
    db.add(StatusEvent(entity_type="listing", entity_id=listing.id, status="cancelled", actor_id=donor.id, note=reason))
    db.commit()
    db.refresh(listing)
    return listing