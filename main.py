from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes import auth, agents, bookings, posts, checklist, scam

app = FastAPI(
    title="Japa App API",
    description="Backend API for the Japa App — Nigeria's trusted relocation platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTES ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(bookings.router)
app.include_router(posts.router)
app.include_router(checklist.router)
app.include_router(scam.router)

@app.get("/")
async def root():
    return {
        "service": "Japa App API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
