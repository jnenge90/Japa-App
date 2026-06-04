from fastapi import APIRouter, HTTPException, Query, Security
from models.schemas import PostCreate, CommentCreate
from database import supabase
from auth_utils import get_current_user, get_optional_user
from typing import Optional

router = APIRouter(prefix="/posts", tags=["community"])

@router.get("")
async def list_posts(
    channel: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = Query("trending", regex="^(trending|recent|unanswered)$"),
    limit: int = Query(20, le=50),
    offset: int = 0
):
    q = supabase.table("posts").select("*, profiles(full_name, avatar_url, is_relocated, relocated_to)")
    if channel and channel != "all":
        q = q.eq("channel", channel)
    if search:
        q = q.or_(f"title.ilike.%{search}%,content.ilike.%{search}%")
    if sort == "recent":
        q = q.order("created_at", desc=True)
    elif sort == "unanswered":
        q = q.eq("comment_count", 0).order("created_at", desc=True)
    else:
        q = q.order("upvotes", desc=True)
    q = q.range(offset, offset + limit - 1)
    res = q.execute()
    return {"posts": res.data, "total": len(res.data)}

@router.post("")
async def create_post(body: PostCreate, user=Security(get_current_user)):
    BANNED_KEYWORDS = ["send money", "100% guaranteed", "pay me", "contact me privately", "whatsapp me"]
    content_lower = body.content.lower() + body.title.lower()
    for kw in BANNED_KEYWORDS:
        if kw in content_lower:
            raise HTTPException(400, f"Post contains prohibited content: '{kw}'. Community posts cannot solicit payments or guarantee visa approvals.")
    res = supabase.table("posts").insert({
        "user_id": user["id"],
        "title": body.title,
        "content": body.content,
        "channel": body.channel,
        "tags": body.tags
    }).execute()
    return res.data[0]

@router.get("/{post_id}")
async def get_post(post_id: str):
    res = supabase.table("posts").select("*, profiles(full_name, avatar_url, is_relocated, relocated_to)").eq("id", post_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Post not found")
    comments = supabase.table("comments").select("*, profiles(full_name, avatar_url, is_relocated, relocated_to)").eq("post_id", post_id).order("created_at").execute()
    return {**res.data, "comments": comments.data}

@router.post("/{post_id}/upvote")
async def upvote_post(post_id: str, user=Security(get_current_user)):
    existing = supabase.table("post_upvotes").select("*").eq("user_id", user["id"]).eq("post_id", post_id).execute()
    if existing.data:
        supabase.table("post_upvotes").delete().eq("user_id", user["id"]).eq("post_id", post_id).execute()
        supabase.table("posts").update({"upvotes": supabase.raw("upvotes - 1")}).eq("id", post_id).execute()
        return {"action": "removed"}
    supabase.table("post_upvotes").insert({"user_id": user["id"], "post_id": post_id}).execute()
    supabase.table("posts").update({"upvotes": supabase.raw("upvotes + 1")}).eq("id", post_id).execute()
    return {"action": "added"}

@router.get("/{post_id}/comments")
async def get_comments(post_id: str):
    res = supabase.table("comments").select("*, profiles(full_name, avatar_url, is_relocated, relocated_to)").eq("post_id", post_id).order("created_at").execute()
    return {"comments": res.data}

@router.post("/{post_id}/comments")
async def add_comment(post_id: str, body: CommentCreate, user=Security(get_current_user)):
    post = supabase.table("posts").select("id").eq("id", post_id).single().execute()
    if not post.data:
        raise HTTPException(404, "Post not found")
    res = supabase.table("comments").insert({"post_id": post_id, "user_id": user["id"], "content": body.content}).execute()
    return res.data[0]

@router.delete("/{post_id}")
async def delete_post(post_id: str, user=Security(get_current_user)):
    post = supabase.table("posts").select("user_id").eq("id", post_id).single().execute()
    if not post.data or post.data["user_id"] != user["id"]:
        raise HTTPException(403, "Not your post")
    supabase.table("posts").delete().eq("id", post_id).execute()
    return {"message": "Post deleted"}
