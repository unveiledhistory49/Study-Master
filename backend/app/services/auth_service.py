from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.concept import Concept
from app.models.profile import StudentProfile

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a plain password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
    """Authenticate a user by username and password (case-insensitive)."""
    result = await db.execute(select(User).where(func.lower(User.username) == username.lower()))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get the current user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


async def register_user(
    db: AsyncSession,
    username: str,
    password: str,
    email: str | None = None,
) -> User:
    """Register a new user, validate credentials, and automatically initialize their student profiles."""
    username_clean = username.strip()
    if not username_clean or len(username_clean) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long",
        )
    if not password or len(password) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 3 characters long",
        )

    # Case-insensitive username check
    existing = await db.execute(
        select(User).where(func.lower(User.username) == username_clean.lower())
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already registered",
        )

    # Create new user record
    new_user = User(
        username=username_clean,
        password_hash=hash_password(password),
        email=email.strip() if email else None,
        role="student",
    )
    db.add(new_user)
    await db.flush()  # Populates new_user.id

    # Automatically provision StudentProfile records for all available subjects
    subjects_res = await db.execute(select(Subject))
    subjects = subjects_res.scalars().all()

    for subject in subjects:
        concept_count_res = await db.execute(
            select(func.count(Concept.id))
            .join(Topic, Concept.topic_id == Topic.id)
            .where(Topic.subject_id == subject.id)
        )
        concept_count = concept_count_res.scalar() or 0

        profile = StudentProfile(
            user_id=new_user.id,
            subject_id=subject.id,
            mastery_score=0.0,
            total_study_time_minutes=0,
            concepts_mastered=0,
            total_concepts=concept_count,
            current_streak=0,
        )
        db.add(profile)

    await db.commit()
    await db.refresh(new_user)
    return new_user

