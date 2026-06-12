# Hackathon Tools

Recommended tools for rapid development during hackathons, organized by category. All tools listed prioritize speed of setup over production maturity.

---

## AI & LLM APIs

| Tool                           | Use Case                                               | Setup Time |
| ------------------------------ | ------------------------------------------------------ | ---------- |
| **OpenAI API** (GPT-4, GPT-4o) | Conversational AI, text generation, classification     | <15 min    |
| **Anthropic API** (Claude)     | Long-context reasoning, document analysis              | <15 min    |
| **Google Gemini API**          | Multimodal inputs (image + text)                       | <15 min    |
| **Replicate**                  | Open-source model inference (image gen, audio, vision) | <20 min    |
| **Groq**                       | Ultra-fast LLM inference for latency-sensitive demos   | <15 min    |
| **Hugging Face Inference API** | Specialized models (NLP, vision, audio)                | <20 min    |
| **LangChain / LlamaIndex**     | RAG pipelines, memory, agent frameworks                | <30 min    |

**Hackathon tip:** Use OpenAI or Anthropic for their reliability. Use Groq when response latency matters for the demo experience.

---

## Backend Frameworks

| Tool                   | Language   | Best For                                   | Setup Time |
| ---------------------- | ---------- | ------------------------------------------ | ---------- |
| **FastAPI**            | Python     | REST APIs, async endpoints, ML integration | <10 min    |
| **Flask**              | Python     | Simple REST APIs, minimal boilerplate      | <5 min     |
| **Express.js**         | Node.js    | JavaScript full-stack, quick REST APIs     | <10 min    |
| **Next.js API Routes** | TypeScript | Combined frontend/backend in one project   | <15 min    |
| **Hono**               | TypeScript | Edge-native APIs, Cloudflare Workers       | <10 min    |

**Hackathon tip:** FastAPI for Python-heavy teams (ML integration is easiest). Next.js API routes for JS teams (eliminates a separate backend repo).

---

## Frontend Frameworks

| Tool                    | Best For                                                      | Setup Time |
| ----------------------- | ------------------------------------------------------------- | ---------- |
| **Next.js** (React)     | Full-featured web apps, SSR, file-based routing               | <15 min    |
| **Vite + React**        | Fast SPA development, no SSR needed                           | <10 min    |
| **Streamlit**           | Python data apps and ML demos; zero frontend knowledge needed | <5 min     |
| **Gradio**              | AI model demos; instant UI for ML models                      | <5 min     |
| **Expo (React Native)** | Mobile demos on iOS/Android                                   | <20 min    |

**Hackathon tip:** Streamlit and Gradio are game-changers for AI/ML teams with no frontend experience. A Streamlit app demoed on a laptop beats a half-finished React app every time.

---

## Databases & Storage

| Tool                   | Type                | Best For                                  | Setup Time |
| ---------------------- | ------------------- | ----------------------------------------- | ---------- |
| **Redis**              | In-memory key-value | Session data, caching, real-time state    | <5 min     |
| **SQLite**             | File-based SQL      | Simple relational data, no server needed  | <2 min     |
| **Supabase**           | Postgres + realtime | Full relational DB with auth and realtime | <15 min    |
| **Firebase Firestore** | NoSQL realtime      | Realtime sync, mobile-friendly            | <15 min    |
| **Pinecone**           | Vector DB           | Semantic search, RAG pipelines            | <20 min    |
| **ChromaDB**           | Vector DB (local)   | Local RAG without cloud API               | <10 min    |

**Hackathon tip:** Redis for anything that needs to persist across requests. SQLite for simple structured data. Pinecone or ChromaDB if the demo involves semantic search.

---

## Deployment & Hosting

| Tool                    | Best For                                    | Free Tier | Deploy Time |
| ----------------------- | ------------------------------------------- | --------- | ----------- |
| **Railway**             | Backend APIs, databases, Docker             | Yes       | <10 min     |
| **Render**              | Web services, background workers            | Yes       | <10 min     |
| **Vercel**              | Next.js, static sites, serverless functions | Yes       | <5 min      |
| **Fly.io**              | Docker containers, global edge              | Yes       | <15 min     |
| **Replit**              | Quick demos, no local setup                 | Yes       | <5 min      |
| **Hugging Face Spaces** | Gradio / Streamlit apps                     | Yes       | <10 min     |
| **Cloudflare Pages**    | Static sites + Workers                      | Yes       | <10 min     |

**Hackathon tip:** Railway is the fastest path from "runs locally" to "runs on a URL." Use it as the default unless a sponsor offers credits elsewhere.

---

## Auth & User Management

| Tool                  | Best For                                 | Setup Time |
| --------------------- | ---------------------------------------- | ---------- |
| **Clerk**             | Drop-in auth with social login           | <15 min    |
| **Auth0**             | Enterprise-grade auth, many integrations | <20 min    |
| **Supabase Auth**     | Auth bundled with Supabase DB            | <10 min    |
| **NextAuth.js**       | Auth for Next.js apps                    | <15 min    |
| **Hardcoded session** | Skip auth for demo; one user only        | <1 min     |

**Hackathon tip:** Skip auth unless it is part of the demo. Use a hardcoded demo session. Auth is almost never worth the time cost in a hackathon.

---

## Real-Time & Communication

| Tool          | Best For                                               | Setup Time |
| ------------- | ------------------------------------------------------ | ---------- |
| **Pusher**    | Real-time events, websockets without managing a server | <15 min    |
| **Ably**      | Real-time pub/sub, chat, live collaboration            | <15 min    |
| **Socket.io** | Full-control websockets with Node.js                   | <15 min    |
| **Twilio**    | SMS, voice, WhatsApp messaging                         | <20 min    |
| **Resend**    | Transactional email in one API call                    | <10 min    |

---

## UI Component Libraries

| Tool             | Framework | Best For                                       | Setup Time |
| ---------------- | --------- | ---------------------------------------------- | ---------- |
| **shadcn/ui**    | React     | High-quality accessible components, copy-paste | <10 min    |
| **Chakra UI**    | React     | Fast theming, accessible defaults              | <10 min    |
| **Mantine**      | React     | Rich component set, forms, charts              | <10 min    |
| **Tailwind CSS** | Any       | Utility-first styling, no design needed        | <5 min     |
| **DaisyUI**      | Tailwind  | Pre-built Tailwind component themes            | <5 min     |

**Hackathon tip:** shadcn/ui + Tailwind is the fastest path to a polished-looking UI for React teams. Copy the components you need; don't install what you don't.

---

## Data, APIs & Integrations

| Tool                | Use Case                                | Setup Time |
| ------------------- | --------------------------------------- | ---------- |
| **Stripe**          | Payment demos (use test mode)           | <20 min    |
| **Google Maps API** | Location, geocoding, mapping            | <15 min    |
| **Mapbox**          | Custom map styling, route visualization | <15 min    |
| **Alpha Vantage**   | Financial market data                   | <10 min    |
| **NewsAPI**         | News aggregation for content demos      | <10 min    |
| **Open-Meteo**      | Free weather data, no API key needed    | <5 min     |
| **The Movie DB**    | Media metadata for entertainment demos  | <10 min    |

---

## Developer Productivity

| Tool                   | Use Case                                                 |
| ---------------------- | -------------------------------------------------------- |
| **GitHub Copilot**     | AI code completion; fastest boilerplate generation       |
| **Claude Code**        | Agentic coding; multi-file edits; architectural guidance |
| **Cursor**             | AI-native editor; inline code generation                 |
| **Ngrok**              | Expose local server to public URL for webhooks/demos     |
| **Postman / Insomnia** | API testing and debugging                                |
| **TablePlus**          | Visual DB browser for SQLite, Postgres, Redis            |
| **Excalidraw**         | Quick architecture diagrams for pitch decks              |

---

## Prototyping & Design

| Tool         | Use Case                                | Setup Time       |
| ------------ | --------------------------------------- | ---------------- |
| **Figma**    | UI mockups and design handoff           | <5 min (browser) |
| **v0.dev**   | Generate React UI from text description | <5 min           |
| **Lovable**  | Full-stack app generation from prompt   | <10 min          |
| **Bolt.new** | Instant browser-based app scaffolding   | <5 min           |
| **Canva**    | Pitch deck design, social graphics      | <5 min           |

**Hackathon tip:** v0.dev can generate a passable starting UI component from a text description in under 2 minutes. Use it to unblock frontend development while the backend is being built.

---

## Recommended Hackathon Stack

This stack is optimized for three things: minimal infrastructure setup time, fast deployment, and reliable live demos. It can be fully operational within 30 minutes from a blank project.

### Frontend — Vercel

- Zero-config deployment from GitHub push
- Automatic HTTPS, preview URLs per branch, and edge CDN
- Native support for Next.js (recommended) and any static framework
- Free tier sufficient for any hackathon demo load
- **Why:** A production URL in under 2 minutes with no DevOps

### Backend — Render

- Deploy any Dockerfile or native runtime (Python, Node, Go, Ruby)
- Persistent disk, background workers, and cron jobs available
- Free tier supports one always-on web service
- Automatic deploys from GitHub
- **Why:** Fastest path from "runs locally" to "runs on a URL" for backend APIs

### Database — Supabase

- Managed Postgres with a web UI, REST API, and realtime subscriptions
- Built-in auth (email, OAuth, magic link) if needed
- Vector search extension available for AI/embedding demos
- Instant project creation; credentials available in 60 seconds
- **Why:** Full relational DB plus auth without any infrastructure management

### AI Model Routing

Use one or more of the following depending on model requirements:

| Provider       | Best For                                    | Latency            | Free Tier     |
| -------------- | ------------------------------------------- | ------------------ | ------------- |
| **Groq**       | Fastest inference for Llama, Mixtral, Gemma | Ultra-low (<100ms) | Yes           |
| **OpenRouter** | Access 200+ models via one API key          | Model-dependent    | Yes (credits) |
| **Nvidia NIM** | GPU-accelerated inference for open models   | Low                | Yes (trial)   |

- **Groq:** Use when demo UX depends on near-instant LLM responses (chat, autocomplete, real-time suggestions)
- **OpenRouter:** Use when model flexibility is needed or sponsor requires a specific model; one API key routes to any provider
- **Nvidia NIM:** Use when running open-weight models (Llama, Mistral) with high throughput requirements

### Stack Summary

```
┌────────────────────────────────────────────────┐
│  User Browser / Mobile                         │
│         ↓                                      │
│  Next.js on Vercel  (Frontend)                 │
│         ↓                                      │
│  FastAPI / Express on Render  (Backend API)    │
│         ↓                          ↓           │
│  Supabase Postgres (DB)    Groq / OpenRouter   │
│                             / Nvidia NIM (LLM) │
└────────────────────────────────────────────────┘
```

### Setup Time Estimates

| Component                       | Time to First Deploy |
| ------------------------------- | -------------------- |
| Vercel (Next.js)                | 3–5 min              |
| Render (FastAPI)                | 5–10 min             |
| Supabase (Postgres)             | 2–3 min              |
| Groq API key + first call       | 5 min                |
| OpenRouter API key + first call | 5 min                |

**Total stack operational:** ~20–30 minutes from scratch

**Reference architecture:** See `knowledge/hackathon-reference-architecture.md` for a detailed request flow diagram and implementation notes.
