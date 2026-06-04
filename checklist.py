from fastapi import APIRouter, HTTPException, Security
from models.schemas import ChecklistSave
from database import supabase
from auth_utils import get_current_user

router = APIRouter(prefix="/checklist", tags=["checklist"])

@router.get("")
async def get_checklist(user=Security(get_current_user)):
    res = supabase.table("checklists").select("*").eq("user_id", user["id"]).single().execute()
    if not res.data:
        return {"checklist": None}
    return {"checklist": res.data}

@router.put("")
async def save_checklist(body: ChecklistSave, user=Security(get_current_user)):
    existing = supabase.table("checklists").select("id").eq("user_id", user["id"]).execute()
    data = {"country": body.country, "visa_type": body.visa_type, "completed_items": body.completed_items, "user_id": user["id"]}
    if existing.data:
        res = supabase.table("checklists").update(data).eq("user_id", user["id"]).execute()
    else:
        res = supabase.table("checklists").insert(data).execute()
    return {"checklist": res.data[0]}

@router.get("/share/{token}")
async def get_shared_checklist(token: str):
    res = supabase.table("checklists").select("country, visa_type, completed_items, profiles(full_name)").eq("share_token", token).single().execute()
    if not res.data:
        raise HTTPException(404, "Checklist not found or not shared")
    return res.data

@router.post("/share")
async def get_share_link(user=Security(get_current_user)):
    res = supabase.table("checklists").select("share_token").eq("user_id", user["id"]).single().execute()
    if not res.data:
        raise HTTPException(404, "No checklist found. Create one first.")
    return {"share_url": f"/checklist/share/{res.data['share_token']}"}
