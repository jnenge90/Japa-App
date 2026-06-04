from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# ── AUTH ────────────────────────────────────────────────────────────────────
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# ── PROFILE ─────────────────────────────────────────────────────────────────
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    country_target: Optional[str] = None
    visa_type: Optional[str] = None
    bio: Optional[str] = None
    is_relocated: Optional[bool] = None
    relocated_to: Optional[str] = None

# ── AGENTS ──────────────────────────────────────────────────────────────────
class AgentCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    city: str
    nis_licence: str
    cac_number: Optional[str] = None
    bio: str
    years_exp: int = 0
    countries: List[str] = []
    visa_types: List[str] = []
    languages: List[str] = ["English"]
    price_from: int = 0
    price_full: int = 0

class AgentFilter(BaseModel):
    country: Optional[str] = None
    visa_type: Optional[str] = None
    min_rating: Optional[float] = None
    search: Optional[str] = None
    limit: int = 20
    offset: int = 0

# ── BOOKINGS ─────────────────────────────────────────────────────────────────
class BookingCreate(BaseModel):
    agent_id: str
    service_type: str
    description: Optional[str] = None
    escrow_amount: int = 0

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    milestone_notes: Optional[str] = None
    escrow_released: Optional[bool] = None

# ── REVIEWS ──────────────────────────────────────────────────────────────────
class ReviewCreate(BaseModel):
    agent_id: str
    booking_id: str
    rating: int = Field(ge=1, le=5)
    content: str

# ── POSTS ────────────────────────────────────────────────────────────────────
class PostCreate(BaseModel):
    title: str = Field(min_length=5)
    content: str = Field(min_length=20)
    channel: str
    tags: List[str] = []

class CommentCreate(BaseModel):
    content: str = Field(min_length=3)

# ── CHECKLIST ────────────────────────────────────────────────────────────────
class ChecklistSave(BaseModel):
    country: str
    visa_type: str
    completed_items: List[str] = []

# ── SCAM REPORT ──────────────────────────────────────────────────────────────
class ScamReportCreate(BaseModel):
    agent_name: str
    company_name: Optional[str] = None
    location: Optional[str] = None
    amount_lost: Optional[int] = None
    description: str = Field(min_length=50)
    evidence_url: Optional[str] = None
