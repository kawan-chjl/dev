# Hackathon Reference Architecture

A simple, proven architecture for hackathon projects using the recommended stack. Optimized for minimal setup time, reliable demos, and fast iteration.

---

## Stack Overview

| Layer     | Technology                     | Role                                             |
| --------- | ------------------------------ | ------------------------------------------------ |
| Frontend  | Next.js on Vercel              | UI, routing, server-side rendering               |
| Backend   | FastAPI on Render              | REST API, business logic, LLM orchestration      |
| Database  | Supabase (Postgres)            | Persistent data, optional auth, optional vectors |
| AI Router | Groq / OpenRouter / Nvidia NIM | LLM inference                                    |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User (Browser)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │  HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Next.js Frontend — Vercel Edge Network             │
│                                                                 │
│  Pages / App Router           API Routes (optional lightweight) │
│  React components             Server-side props / actions       │
│  Static assets via CDN                                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │  HTTPS / REST
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              FastAPI Backend — Render Web Service               │
│                                                                 │
│  /api/v1/...  (REST endpoints)                                  │
│  Business logic & validation                                    │
│  LLM prompt construction                                        │
│  Database access layer                                          │
└────────────────────┬──────────────────────┬─────────────────────┘
                     │                      │
          SQL/REST   │                      │  HTTPS / API key
                     ▼                      ▼
┌───────────────────────────┐  ┌───────────────────────────────────┐
│  Supabase (Postgres)      │  │  AI Model Router                  │
│                           │  │                                   │
│  Tables & relations       │  │  Groq  — ultra-fast inference     │
│  Row-level security       │  │  OpenRouter — 200+ model access   │
│  REST API auto-generated  │  │  Nvidia NIM — open model GPU      │
│  Realtime subscriptions   │  │                                   │
│  pgvector (optional)      │  │  Returns: text, JSON, embeddings  │
└───────────────────────────┘  └───────────────────────────────────┘
```

---

## Request Flow

### Standard AI Feature Request

```
1. User submits input via Next.js frontend
2. Frontend POST → Render API  /api/v1/[feature]
3. Render API validates input
4. Render API queries Supabase for user context / prior session data
5. Render API constructs LLM prompt with context
6. Render API calls Groq / OpenRouter / Nvidia NIM
7. LLM returns response
8. Render API writes result + metadata to Supabase
9. Render API returns response to frontend
10. Frontend renders result
```

### Realtime / Streaming Request (optional)

```
1. Frontend opens SSE or WebSocket to Render API
2. Render API streams LLM tokens via Groq streaming API
3. Frontend renders tokens as they arrive
4. Render API finalizes and persists full response to Supabase
```

---

## Component Setup Guide

### Vercel (Frontend)

```bash
# Create Next.js project
npx create-next-app@latest my-project --typescript --tailwind --app

# Deploy
git push → Vercel auto-deploys on every push
# or: vercel --prod
```

**Environment variables to set in Vercel dashboard:**

```
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com
```

---

### Render (Backend)

**`render.yaml` (optional, for one-click deploy):**

```yaml
services:
  - type: web
    name: hackathon-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
```

**Minimal FastAPI entry point (`main.py`):**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app.vercel.app", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health(): return {"status": "ok"}
```

---

### Supabase (Database)

```bash
# Install client
pip install supabase        # Python
npm install @supabase/supabase-js  # TypeScript
```

**Python usage:**

```python
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Insert
supabase.table("sessions").insert({"user_id": "demo", "summary": "..."}).execute()

# Query
result = supabase.table("sessions").select("*").eq("user_id", "demo").execute()
```

---

### Groq (AI Inference)

```python
from groq import Groq
client = Groq(api_key=GROQ_API_KEY)

response = client.chat.completions.create(
    model="llama-3.1-70b-versatile",   # or mixtral-8x7b-32768, gemma2-9b-it
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": user_input}
    ]
)
print(response.choices[0].message.content)
```

**Recommended Groq models for hackathons:**

| Model                     | Speed   | Context | Best For                          |
| ------------------------- | ------- | ------- | --------------------------------- |
| `llama-3.1-8b-instant`    | Fastest | 128k    | Real-time chat, low latency demos |
| `llama-3.1-70b-versatile` | Fast    | 128k    | General reasoning, complex tasks  |
| `mixtral-8x7b-32768`      | Fast    | 32k     | Instruction following, code       |

---

### OpenRouter (Multi-Model Routing)

```python
import requests

response = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
    json={
        "model": "anthropic/claude-3.5-sonnet",  # or any supported model
        "messages": [{"role": "user", "content": user_input}]
    }
)
```

**Use OpenRouter when:**

- Sponsor requires use of a specific model (just change the model string)
- You want to compare model outputs during development
- Fallback routing between providers is needed for demo reliability

---

## Hackathon-Specific Architecture Patterns

### Pattern 1: Hardcoded Demo Session

For demos that do not require real authentication:

```python
DEMO_USER_ID = "hackathon-demo"

# All data reads/writes use this ID
# Never implement auth unless it is the demo feature itself
```

**Why:** Auth implementation costs 2–4 hours and is never visible to judges.

---

### Pattern 2: Lazy External API Calls

Wrap every external API call in a try/except with a hardcoded fallback:

```python
def get_llm_response(prompt: str) -> str:
    try:
        return groq_client.call(prompt)
    except Exception:
        return HARDCODED_DEMO_RESPONSE  # Pre-prepared for the demo scenario
```

**Why:** Live API failures during demos are demo-ending events. Fallbacks are not optional.

---

### Pattern 3: Pre-Seeded Demo State

Load all demo data before the demo starts:

```python
# run_before_demo.py
def seed_demo_data():
    supabase.table("sessions").upsert({
        "user_id": "hackathon-demo",
        "summary": "User previously discussed anxiety about upcoming exam deadline."
    }).execute()
```

**Why:** Judges should never watch you type setup data. The demo starts with state already loaded.

---

### Pattern 4: Health Check Endpoint

Always implement a `/health` endpoint and verify it before judging:

```python
@app.get("/health")
def health():
    return {
        "api": "ok",
        "db": check_supabase(),
        "llm": check_groq()
    }
```

**Why:** Confirms all dependencies are live before you stand up to present.

---

## Environment Variables Reference

| Variable              | Set In | Used By                    |
| --------------------- | ------ | -------------------------- |
| `NEXT_PUBLIC_API_URL` | Vercel | Frontend → Backend URL     |
| `SUPABASE_URL`        | Render | Backend → Supabase         |
| `SUPABASE_KEY`        | Render | Backend → Supabase         |
| `GROQ_API_KEY`        | Render | Backend → Groq             |
| `OPENROUTER_API_KEY`  | Render | Backend → OpenRouter       |
| `OPENAI_API_KEY`      | Render | Backend → OpenAI (if used) |

**Security rule:** Never expose API keys in frontend code or public repos. All LLM calls must go through the backend.

---

## When to Deviate from This Stack

| Situation                                         | Alternative                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Team is Python-only with no frontend skills       | Streamlit or Gradio instead of Next.js + Vercel                   |
| Mobile demo required                              | Expo (React Native) for frontend                                  |
| Real-time collaboration is the core feature       | Add Ably or Pusher to the backend                                 |
| Demo requires image/video generation              | Add Replicate API calls in the backend                            |
| Sponsor requires specific cloud (AWS, GCP, Azure) | Deploy Render equivalent on sponsor cloud; keep Supabase and Groq |
