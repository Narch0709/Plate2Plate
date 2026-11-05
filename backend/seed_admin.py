import os
from dotenv import load_dotenv
from sqlalchemy import select

from database import SessionLocal
from models import User
from security import hash_password

load_dotenv()


def main():
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    if not email or not password:
        raise SystemExit("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first")

    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == email.lower())):
            print("Admin already exists")
            return
        db.add(
            User(
                name="Admin",
                email=email.lower(),
                password_hash=hash_password(password),
                role="admin",
                is_verified=True,
            )
        )
        db.commit()
        print("Admin created")
    finally:
        db.close()


if __name__ == "__main__":
    main()