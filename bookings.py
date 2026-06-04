from fastapi import APIRouter, HTTPException, Security
from models.schemas import BookingCreate, BookingUpdate
from database import supabase
from auth_utils import get_current_user

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.post("")
async def create_booking(body: BookingCreate, user=Security(get_current_user)):
    agent = supabase.table("agents").select("id,full_name,verified").eq("id", body.agent_id).single().execute()
    if not agent.data or not agent.data["verified"]:
        raise HTTPException(400, "Agent not found or not verified")
    res = supabase.table("bookings").insert({
        "user_id": user["id"],
        "agent_id": body.agent_id,
        "service_type": body.service_type,
        "description": body.description,
        "escrow_amount": body.escrow_amount,
        "status": "pending"
    }).execute()
    return {"booking": res.data[0], "message": "Booking created. Your payment will be held in escrow."}

@router.get("")
async def my_bookings(user=Security(get_current_user)):
    res = supabase.table("bookings").select("*, agents(full_name, city, avg_rating, avatar_url)").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    return {"bookings": res.data}

@router.get("/{booking_id}")
async def get_booking(booking_id: str, user=Security(get_current_user)):
    res = supabase.table("bookings").select("*, agents(*)").eq("id", booking_id).eq("user_id", user["id"]).single().execute()
    if not res.data:
        raise HTTPException(404, "Booking not found")
    return res.data

@router.patch("/{booking_id}")
async def update_booking(booking_id: str, body: BookingUpdate, user=Security(get_current_user)):
    booking = supabase.table("bookings").select("id,user_id").eq("id", booking_id).single().execute()
    if not booking.data or booking.data["user_id"] != user["id"]:
        raise HTTPException(403, "Not your booking")
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    res = supabase.table("bookings").update(data).eq("id", booking_id).execute()
    return res.data[0]

@router.post("/{booking_id}/release-escrow")
async def release_escrow(booking_id: str, user=Security(get_current_user)):
    booking = supabase.table("bookings").select("*").eq("id", booking_id).eq("user_id", user["id"]).single().execute()
    if not booking.data:
        raise HTTPException(404, "Booking not found")
    if booking.data["escrow_released"]:
        raise HTTPException(400, "Escrow already released")
    supabase.table("bookings").update({"escrow_released": True, "status": "completed"}).eq("id", booking_id).execute()
    return {"message": "Escrow released. The agent has been paid. Please leave a review!"}
