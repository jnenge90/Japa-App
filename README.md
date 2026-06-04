# 🛡️ Japa App — Full Stack

Nigeria's trusted relocation platform. FastAPI backend + Supabase database + Vercel frontend.

---

## 🏗️ Architecture

```
Frontend (Vercel)  →  FastAPI Backend (Railway)  →  Supabase (PostgreSQL + Auth)
```

---

## 🚀 Deploy in 5 Steps

### Step 1: Set up Supabase
1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Open **SQL Editor** → paste the entire contents of `supabase/schema.sql` → Run
3. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (secret) → `SUPABASE_SERVICE_KEY`
   - **JWT Secret** (under Auth settings) → `SUPABASE_JWT_SECRET`
4. Go to **Authentication → Settings** → set your site URL to your Vercel URL later

### Step 2: Deploy Backend to Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Push this repo to GitHub, connect it to Railway
3. Set the **Root Directory** to `/` (the `railway.json` is at the root)
4. Add these **Environment Variables** in Railway:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   SECRET_KEY=any-random-32-char-string
   FRONTEND_URL=https://your-app.vercel.app
   ENVIRONMENT=production
   ```
5. Deploy — Railway gives you a URL like `https://japaapp-api.railway.app`

### Step 3: Set your API URL in the Frontend
Open `frontend/js/api.js` and change line 6:
```js
const API_BASE = 'https://japaapp-api.railway.app';  // ← your Railway URL
```

### Step 4: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set **Framework Preset** to "Other"
3. Set **Root Directory** to `frontend`
4. Deploy — Vercel gives you a URL like `https://japaapp.vercel.app`

### Step 5: Final Config
1. Back in Supabase → **Auth Settings** → update **Site URL** to your Vercel URL
2. In Railway → update `FRONTEND_URL` env var to your Vercel URL
3. Redeploy backend on Railway

---

## 🧪 Test Locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your Supabase keys
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

**Frontend:**
```bash
# Open frontend/index.html with Live Server (VS Code extension)
# Or: npx serve frontend
```

To point local frontend at local backend, open `frontend/js/api.js` and set:
```js
const API_BASE = 'http://localhost:8000';
```

---

## 📁 Project Structure

```
japaapp-fullstack/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── config.py             # Environment settings
│   ├── database.py           # Supabase client
│   ├── auth_utils.py         # JWT verification
│   ├── requirements.txt
│   ├── .env.example
│   ├── models/
│   │   └── schemas.py        # Pydantic request/response models
│   └── routes/
│       ├── auth.py           # Signup, login, profile
│       ├── agents.py         # Agent marketplace
│       ├── bookings.py       # Escrow bookings
│       ├── posts.py          # Community posts & comments
│       ├── checklist.py      # Relocation checklist
│       └── scam.py           # Scam reporting
├── frontend/
│   ├── index.html            # Home page
│   ├── agents.html           # Agent marketplace
│   ├── countries.html        # Country guides
│   ├── community.html        # Community forum
│   ├── checklist.html        # Relocation checklist
│   ├── style.css             # Global styles
│   └── js/
│       ├── api.js            # API client (all fetch calls)
│       ├── auth.js           # Auth modal + nav state
│       └── app.js            # Page-specific logic
├── supabase/
│   └── schema.sql            # Full database schema + RLS policies
├── railway.json              # Railway deployment config
├── vercel.json               # Vercel deployment config
├── Procfile                  # Process definition
└── README.md                 # This file
```

---

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | No | Create account |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/auth/me` | Yes | Get current user |
| GET | `/agents` | No | List verified agents |
| GET | `/agents/{id}` | No | Get agent + reviews |
| POST | `/agents/register` | Yes | Register as agent |
| POST | `/bookings` | Yes | Create escrow booking |
| GET | `/bookings` | Yes | My bookings |
| POST | `/bookings/{id}/release-escrow` | Yes | Release payment to agent |
| GET | `/posts` | No | Community posts |
| POST | `/posts` | Yes | Create post |
| POST | `/posts/{id}/comments` | Yes | Add comment |
| GET | `/checklist` | Yes | Get my checklist |
| PUT | `/checklist` | Yes | Save checklist progress |
| GET | `/scam-reports` | No | View scam database |
| POST | `/scam-reports` | Yes | Submit scam report |

Full interactive docs at `https://your-railway-url.railway.app/docs`

---

## 🛡️ Security
- All user data protected by Supabase Row Level Security (RLS)
- Passwords hashed by Supabase Auth (bcrypt)
- JWT tokens verified on every protected route
- Community posts scanned for prohibited keywords before publishing
- Escrow payments held until user explicitly releases them

---

Built with ❤️ for Nigerians who deserve to relocate safely.
