from fastapi import APIRouter, HTTPException, Query, Security
from models.schemas import AgentCreate, BookingCreate, ReviewCreate
from database import supabase
from auth_utils import get_current_user, get_optional_user
from typing import Optional

router = APIRouter(prefix="/agents", tags=["agents"])

@router.get("")
async def list_agents(
    country: Optional[str] = None,
    visa_type: Optional[str] = None,
    min_rating: Optional[float] = None,
    search: Optional[str] = None,
    limit: int = Query(20, le=100),
    offset: int = 0
):
    q = supabase.table("agents").select("*").eq("verified", True)
    if country:
        q = q.contains("countries", [country])
    if visa_type:
        q = q.contains("visa_types", [visa_type])
    if min_rating:
        q = q.gte("avg_rating", min_rating)
    if search:
        q = q.ilike("full_name", f"%{search}%")
    q = q.order("avg_rating", desc=True).range(offset, offset + limit - 1)
    res = q.execute()
    return {"agents": res.data, "total": len(res.data)}

@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    res = supabase.table("agents").select("*").eq("id", agent_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Agent not found")
    reviews = supabase.table("reviews").select("*, profiles(full_name, avatar_url)").eq("agent_id", agent_id).order("created_at", desc=True).limit(10).execute()
    return {**res.data, "reviews": reviews.data}

@router.post("/register")
async def register_agent(body: AgentCreate, user=Security(get_current_user)):
    existing = supabase.table("agents").select("id").eq("user_id", user["id"]).execute()
    if existing.data:
        raise HTTPException(400, "You already have an agent listing")
    data = body.model_dump()
    data["user_id"] = user["id"]
    data["verification_status"] = "pending"
    res = supabase.table("agents").insert(data).execute()
    return {"message": "Agent registration submitted. Verification takes 2-3 business days.", "agent": res.data[0]}

@router.post("/{agent_id}/reviews")
async def add_review(agent_id: str, body: ReviewCreate, user=Security(get_current_user)):
    booking = supabase.table("bookings").select("id").eq("id", body.booking_id).eq("user_id", user["id"]).single().execute()
    if not booking.data:
        raise HTTPException(403, "You can only review agents you booked through Japa App")
    res = supabase.table("reviews").insert({
        "agent_id": agent_id,
        "user_id": user["id"],
        "booking_id": body.booking_id,
        "rating": body.rating,
        "content": body.content
    }).execute()
    return res.data[0]
