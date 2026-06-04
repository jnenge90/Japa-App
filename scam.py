from fastapi import APIRouter, HTTPException, Security
from models.schemas import ScamReportCreate
from database import supabase
from auth_utils import get_current_user

router = APIRouter(prefix="/scam-reports", tags=["safety"])

@router.get("")
async def list_scam_reports(limit: int = 20):
    res = supabase.table("scam_reports").select("*").neq("status", "dismissed").order("created_at", desc=True).limit(limit).execute()
    return {"reports": res.data}

@router.post("")
async def submit_scam_report(body: ScamReportCreate, user=Security(get_current_user)):
    res = supabase.table("scam_reports").insert({**body.model_dump(), "reporter_id": user["id"]}).execute()
    return {"message": "Report submitted. Our team will review within 24 hours.", "report": res.data[0]}
