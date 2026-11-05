from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from database import get_db
from deps import verified_ngo
from models import NgoTransfer, StatusEvent, User
from realtime import queue_event
from schemas import NgoPublic, TransferCreate, TransferOut, TransferRespond

router = APIRouter(prefix="/transfers", tags=["ngo transfers"])


def set_status(db: Session, transfer: NgoTransfer, actor: User, status: str):
    """Change the status, log it, and queue a live update for both NGOs."""
    transfer.status = status
    db.add(
        StatusEvent(
            entity_type="transfer",
            entity_id=transfer.id,
            status=status,
            actor_id=actor.id,
        )
    )
    queue_event(
        db,
        {
            "type": "transfer_status",
            "transfer_id": transfer.id,
            "item": transfer.item_description,
            "status": status,
        },
        user_ids={transfer.from_ngo_id, transfer.to_ngo_id},
        roles={"admin"},
    )


def load_transfer(db: Session, transfer_id: int, me: User) -> NgoTransfer:
    # FOR UPDATE locks the row so two simultaneous actions can't clash
    transfer = db.scalar(select(NgoTransfer).where(NgoTransfer.id == transfer_id).with_for_update())
    if not transfer or me.id not in (transfer.from_ngo_id, transfer.to_ngo_id):
        raise HTTPException(status_code=404, detail="Transfer not found")
    return transfer


@router.get("/ngos", response_model=list[NgoPublic])
def other_ngos(db: Session = Depends(get_db), me: User = Depends(verified_ngo)):
    stmt = select(User).where(User.role == "ngo", User.is_verified.is_(True), User.id != me.id)
    return db.scalars(stmt).all()


@router.get("/mine", response_model=list[TransferOut])
def my_transfers(db: Session = Depends(get_db), me: User = Depends(verified_ngo)):
    stmt = (
        select(NgoTransfer)
        .where(or_(NgoTransfer.from_ngo_id == me.id, NgoTransfer.to_ngo_id == me.id))
        .order_by(NgoTransfer.created_at.desc())
    )
    return db.scalars(stmt).all()


@router.post("", response_model=TransferOut, status_code=201)
def create_transfer(data: TransferCreate, db: Session = Depends(get_db), me: User = Depends(verified_ngo)):
    if data.other_ngo_id == me.id:
        raise HTTPException(status_code=400, detail="You can't make a transfer with your own NGO")
    other = db.get(User, data.other_ngo_id)
    if not other or other.role != "ngo" or not other.is_verified:
        raise HTTPException(status_code=404, detail="NGO not found")

    # offer: I supply them. request: they supply me.
    if data.kind == "offer":
        from_id, to_id = me.id, other.id
    else:
        from_id, to_id = other.id, me.id

    transfer = NgoTransfer(
        from_ngo_id=from_id,
        to_ngo_id=to_id,
        initiated_by_id=me.id,
        item_description=data.item_description,
        quantity_servings=data.quantity_servings,
        note=data.note,
    )
    db.add(transfer)
    db.flush()
    set_status(db, transfer, me, "requested")
    db.commit()
    db.refresh(transfer)
    return transfer


@router.post("/{transfer_id}/respond", response_model=TransferOut)
def respond(
    transfer_id: int,
    data: TransferRespond,
    db: Session = Depends(get_db),
    me: User = Depends(verified_ngo),
):
    transfer = load_transfer(db, transfer_id, me)
    if transfer.initiated_by_id == me.id:
        raise HTTPException(status_code=403, detail="The other NGO has to respond to your proposal")
    if transfer.status != "requested":
        raise HTTPException(status_code=400, detail=f"This transfer is already {transfer.status}")
    set_status(db, transfer, me, "accepted" if data.accept else "rejected")
    db.commit()
    db.refresh(transfer)
    return transfer


@router.post("/{transfer_id}/dispatch", response_model=TransferOut)
def dispatch(transfer_id: int, db: Session = Depends(get_db), me: User = Depends(verified_ngo)):
    transfer = load_transfer(db, transfer_id, me)
    if transfer.from_ngo_id != me.id:
        raise HTTPException(status_code=403, detail="Only the supplying NGO can dispatch the food")
    if transfer.status != "accepted":
        raise HTTPException(status_code=400, detail="The transfer must be accepted first")
    set_status(db, transfer, me, "in_transit")
    db.commit()
    db.refresh(transfer)
    return transfer


@router.post("/{transfer_id}/receive", response_model=TransferOut)
def receive(transfer_id: int, db: Session = Depends(get_db), me: User = Depends(verified_ngo)):
    transfer = load_transfer(db, transfer_id, me)
    if transfer.to_ngo_id != me.id:
        raise HTTPException(status_code=403, detail="Only the receiving NGO can confirm arrival")
    if transfer.status != "in_transit":
        raise HTTPException(status_code=400, detail="The food has not been dispatched yet")
    set_status(db, transfer, me, "completed")
    db.commit()
    db.refresh(transfer)
    return transfer


@router.post("/{transfer_id}/cancel", response_model=TransferOut)
def cancel(transfer_id: int, db: Session = Depends(get_db), me: User = Depends(verified_ngo)):
    transfer = load_transfer(db, transfer_id, me)
    if transfer.initiated_by_id != me.id:
        raise HTTPException(status_code=403, detail="Only the NGO that started this can cancel it")
    if transfer.status not in ("requested", "accepted"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a transfer that is {transfer.status}")
    set_status(db, transfer, me, "cancelled")
    db.commit()
    db.refresh(transfer)
    return transfer