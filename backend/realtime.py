import asyncio

from fastapi import WebSocket
from sqlalchemy import event
from sqlalchemy.orm import Session


class ConnectionManager:
    """Keeps track of who is connected and pushes messages to them."""

    def __init__(self):
        self.active: list[tuple[int, str, WebSocket]] = []
        self.loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, ws: WebSocket, user_id: int, role: str):
        await ws.accept()
        self.active.append((user_id, role, ws))

    def disconnect(self, ws: WebSocket):
        self.active = [c for c in self.active if c[2] is not ws]

    async def _send(self, user_ids: set[int], roles: set[str], message: dict):
        for user_id, role, ws in list(self.active):
            if user_id in user_ids or role in roles:
                try:
                    await ws.send_json(message)
                except Exception:
                    self.disconnect(ws)

    def publish(self, user_ids: set[int], roles: set[str], message: dict):
        # Our API functions run in worker threads, so we hand the message
        # to the main async loop in a thread-safe way.
        if self.loop is None:
            return
        asyncio.run_coroutine_threadsafe(self._send(user_ids, roles, message), self.loop)


manager = ConnectionManager()


def queue_event(db: Session, message: dict, user_ids=(), roles=()):
    """Remember a message to send once the database change is really saved."""
    db.info.setdefault("pending_events", []).append((set(user_ids), set(roles), message))


@event.listens_for(Session, "after_commit")
def _publish_after_commit(session: Session):
    for user_ids, roles, message in session.info.pop("pending_events", []):
        manager.publish(user_ids, roles, message)


@event.listens_for(Session, "after_rollback")
def _drop_after_rollback(session: Session):
    session.info.pop("pending_events", None)