from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials
from models.schemas import SignUpRequest, LoginRequest
from database import supabase
from auth_utils import security, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup")
async def signup(body: SignUpRequest):
    try:
        res = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {"data": {"full_name": body.full_name}}
        })
        if res.user is None:
            raise HTTPException(400, "Signup failed — email may already be registered")
        return {
            "message": "Account created. Please check your email to verify.",
            "user": {"id": str(res.user.id), "email": res.user.email}
        }
    except Exception as e:
        raise HTTPException(400, str(e))

@router.post("/login")
async def login(body: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password({"email": body.email, "password": body.password})
        if not res.session:
            raise HTTPException(401, "Invalid email or password")
        profile = supabase.table("profiles").select("*").eq("id", str(res.user.id)).single().execute()
        return {
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": str(res.user.id),
                "email": res.user.email,
                "full_name": profile.data.get("full_name") if profile.data else None,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(401, "Invalid email or password")

@router.post("/logout")
async def logout(user=Security(get_current_user)):
    supabase.auth.sign_out()
    return {"message": "Logged out"}

@router.get("/me")
async def me(user=Security(get_current_user)):
    profile = supabase.table("profiles").select("*").eq("id", user["id"]).single().execute()
    return profile.data

@router.put("/me")
async def update_profile(body: dict, user=Security(get_current_user)):
    allowed = {"full_name","country_target","visa_type","bio","is_relocated","relocated_to"}
    data = {k: v for k, v in body.items() if k in allowed}
    res = supabase.table("profiles").update(data).eq("id", user["id"]).execute()
    return res.data[0] if res.data else {}
