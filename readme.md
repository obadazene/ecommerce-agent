# 🛒 E-Commerce Agent

**An AI-powered multi-platform product discovery and monitoring system**

**Author:** Aubada Zene Daboul

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Technology Stack](#-technology-stack)
3. [Installation & Execution](#-installation--execution)
4. [Environment Configuration](#-environment-configuration)
5. [Project Structure](#-project-structure)
6. [Features](#-features)
7. [Winning Product Criteria](#-winning-product-criteria)
8. [Test Credentials](#-test-credentials)
9. [Deployment](#-deployment)
10. [Video & Slides](#-video--slides)
11. [License](#-license)

---

## 📖 Project Overview

### What It Does

The E-Commerce Agent is a personal product research assistant that automates AliExpress discovery, product scoring, social-media checks, and marketplace checks for products matching the project’s "Winning Product" criteria.

### Core Capabilities

| #   | Capability              | Description                                                                    |
| --- | ----------------------- | ------------------------------------------------------------------------------ |
| 1   | AliExpress Search       | Searches AliExpress with multiple keywords and fallback scraping               |
| 2   | Cross-Platform Check    | Checks product presence on Amazon, Shopify, WooCommerce, eBay, Temu            |
| 3   | Social Media Monitoring | Searches TikTok, Instagram, Twitter, Facebook, YouTube, Pinterest for mentions |
| 4   | Winning Product Scoring | Scores products against 7 criteria using weighted scoring                      |
| 5   | Daily Email Report      | Sends a detailed report every day at 5 AM                                      |
| 6   | New Product Alerts      | Flags products appearing for the first time on AliExpress under given criteria |
| 7   | Technology Updates      | Notifies monthly about new versions of project technologies                    |
| 8   | Voice Interaction       | Speak to the agent                                                             |
| 9   | Manual Trigger          | Run the search on-demand (anytime)                                             |

---

## 🛠️ Technology Stack

### Backend (Core)

| Component       | Technology | Version |
| --------------- | ---------- | ------- |
| Framework       | NestJS     | v10.x   |
| Language        | TypeScript | v5.x    |
| Runtime         | Node.js    | v20.x   |
| ORM             | Prisma     | v5.x    |
| Database (Prod) | PostgreSQL | v15.x   |
| Database (Dev)  | SQLite     | Latest  |

### Frontend

| Component | Technology   | Version |
| --------- | ------------ | ------- |
| Framework | Next.js      | v14.x   |
| Language  | TypeScript   | v5.x    |
| Styling   | Tailwind CSS | v3.x    |

### AI Orchestration & LLMs

| Component         | Technology       |
| ----------------- | ---------------- |
| Orchestration     | Genkit           |
| Reasoning         | Gemini 2.5 Flash |
| Scraping          | Groq (Llama 3.3) |
| Structured Output | Mistral Small    |

### Python Microservices (AI Workers)

| Service          | Technology                                                               |
| ---------------- | ------------------------------------------------------------------------ |
| Scraper Service  | Python + FastAPI + Bright Data Web Unlocker + BeautifulSoup + Playwright |
| Social Service   | Python + FastAPI + Gemini                                                |
| Detector Service | Python + FastAPI + Mistral                                               |

### Service Communication

| Technology  | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| REST (HTTP) | Service-to-service communication between NestJS and Python microservices |

### DevOps

| Technology     | Description                          |
| -------------- | ------------------------------------ |
| Docker         | Containerization of all services     |
| Docker Compose | Local multi-service orchestration    |
| Render         | Production deployment (free tier)    |
| GitHub Actions | CI/CD pipeline (test, build, deploy) |

### Security (OWASP Top 10)

| OWASP    | Technology             |
| -------- | ---------------------- |
| A04, A07 | JWT + bcrypt           |
| A02      | Helmet.js              |
| A07      | @nestjs/throttler      |
| A05      | class-validator        |
| A03      | npm audit / Dependabot |

---

## 🚀 Installation & Execution

### Prerequisites

| Requirement | Version           |
| ----------- | ----------------- |
| Node.js     | v20+              |
| Python      | v3.11+            |
| Docker      | Latest (optional) |
| Git         | Latest            |

### Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/obadazene/ecommerce-agent.git
cd ecommerce-agent

# 2. Backend Setup
cd backend
npm install
cp .env.example .env
# ⚠️ IMPORTANT: Configure .env with your credentials (see Configuration section below)
npx prisma generate
npx prisma migrate dev --name init

# 3. Start Backend
npm run start:dev

# 4. Frontend Setup (new terminal)
cd frontend
npm install
npm run dev

# 5. Python Microservices (new terminals)
cd services/scraper
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 5001

cd services/social
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 5002

cd services/detector
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 5003
```

### Docker Compose (Recommended)

```bash
docker compose up -d --build
docker compose logs -f backend scraper frontend
docker compose restart backend scraper frontend
docker compose down
```

Use Docker Compose if you want the full stack running together with the same service wiring used in the current setup.

### 🔧 Environment Configuration

After copying `.env.example` to `.env`, configure the following values:

#### Required Configuration

| Variable                          | Description                                  | Example                                                  |
| --------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`                    | PostgreSQL connection string                 | `postgresql://user:pass@localhost:5432/db`               |
| `JWT_SECRET`                      | Secret key for JWT tokens                    | `random-32-char-string`                                  |
| `GEMINI_API_KEY`                  | Google Gemini API key                        | Get from [Google AI Studio](https://aistudio.google.com) |
| `GROQ_API_KEY`                    | Groq API key for LLM                         | Get from [Groq Console](https://console.groq.com)        |
| `MISTRAL_API_KEY`                 | Mistral API key                              | Get from [Mistral Console](https://console.mistral.ai)   |
| `BRIGHT_DATA_API_URL`             | Bright Data Web Unlocker endpoint            | `https://api.brightdata.com/request`                     |
| `BRIGHT_DATA_API_KEY`             | Bright Data Web Unlocker API key             | Required for primary AliExpress scraping                 |
| `BRIGHT_DATA_ZONE`                | Bright Data Web Unlocker zone                | Example: `web_unlocker1`                                 |
| `BRIGHT_DATA_FORMAT`              | Bright Data response format                  | `raw`                                                    |
| `BRIGHT_DATA_MIN_CREDITS`         | Credit threshold for switching to Playwright | `100`                                                    |
| `SEARCH_KEYWORD_CONCURRENCY`      | Parallel keyword workers per run             | `3`                                                      |
| `SEARCH_MAX_BRIGHT_DATA_ATTEMPTS` | Max Bright Data keyword attempts per run     | `3`                                                      |

**Bright Data setup:** Create or copy a Web Unlocker API key from your [Bright Data dashboard](https://brightdata.com/), then set `BRIGHT_DATA_API_URL`, `BRIGHT_DATA_API_KEY`, `BRIGHT_DATA_ZONE`, `BRIGHT_DATA_FORMAT`, and `BRIGHT_DATA_MIN_CREDITS` in `.env`.

#### 📧 Email Configuration (SMTP)

For daily report emails to work, configure your SMTP credentials:

```env
# Gmail Example (recommended for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=your-email@gmail.com
SMTP_TO=recipient@gmail.com
```

**📝 Gmail Setup Instructions:**

1. Enable 2-Factor Authentication on your Gmail account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an App Password for Mail > Windows/Linux
4. Copy the 16-character password to `SMTP_PASS`
5. Use your Gmail address for `SMTP_USER` and `SMTP_FROM`

**Alternative Email Providers:**

- **Outlook:** `smtp.office365.com:587`
- **SendGrid:** `smtp.sendgrid.net:587` (use `apikey` as username)
- **Mailtrap:** `smtp.mailtrap.io:2525` (for testing)

---

## 📱 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `POST /auth/refresh` - Refresh JWT token

### Autonomous Dropshipping Discovery (5 AM Daily)

- `POST /products/auto-search` - **Trigger autonomous product discovery**
  - Searches AliExpress with multiple discovery keywords such as `trending`, `new 2026`, `best seller`, and `hot sale`
  - Runs keyword discovery in parallel batches (default concurrency: 3) with deduped keywords
  - Uses Bright Data first with a per-run cap (default: 3 keyword attempts), then Playwright, then HTML/Bing/demo fallbacks
  - Scores products against the 7 winning criteria
  - Leaves the product URL blank when no reachable URL is available, instead of showing a fallback link
  - Keeps both winning and non-winning products in the report so you can review possible scoring errors, false positives, or false negatives
  - Checks social-media and marketplace presence as decision signals, not hard rejection gates
  - Sends email report with high-potential dropshipping products

- `GET /products/auto-search/criteria` - View scoring thresholds & search parameters

### Manual Product Search (with keyword)

- `POST /products/search` - Search AliExpress with custom keyword
- `POST /products/manual-search` - Same as above
- `GET /products/new` - Find new products detected since last search

### Product Analysis

- `GET /products` - Get all products in database
- `GET /products/new` - Detect newly discovered products + send email

### Current Search Flow

1. Build keywords and run them in small parallel batches.
2. Try Bright Data for a limited number of keyword searches.
3. Fall back to Playwright, then HTML/Bing, then demo/cache when needed.
4. Score the products and run social/ecommerce signals as advisory checks.
5. Keep the URL blank when no reachable product URL exists.
6. Include winners and non-winners in the report for review.

---

## 🤖 How Autonomous Discovery Works

**Every day at 5:00 AM UTC:**

```
1. AliExpress Search
   ↓ (Multiple keywords, deduplicated and processed in parallel batches)
2. Bright Data Web Unlocker
   ↓ (Primary source with capped attempts per run to control credit usage)
3. Playwright / HTML / Bing / demo fallback
   ↓ (Used when Bright Data fails or credits are low)
4. Product Scoring
   ↓ (Scores against 7 winning criteria)
5. Signal Checks
   ↓ (Social-media + e-commerce presence for review, not rejection)
6. Send Email Report
   ↓ (Includes winners and non-winners for AI-review)
```

**Winning Product Criteria (7 factors):**

Each product is scored 0-100 on these 7 dimensions:

| #   | Criteria                 | Weight | Definition                                                                                                                        |
| --- | ------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Wow Factor**           | 25%    | Something unique people haven't seen before. Has surprise/shock value - feels unexpected, novel, or "I didn't know this existed." |
| 2   | **Solves Problem**       | 20%    | The product solves a real problem for customers. Addresses a pain point or real need.                                             |
| 3   | **Makes Better/Easier**  | 15%    | Adds value to people's lives. Makes life easier, better, or more convenient.                                                      |
| 4   | **High Perceived Value** | 15%    | People see it as worth a lot of money. Customers perceive it as expensive/valuable even if it's cheap.                            |
| 5   | **Mass Market Appeal**   | 10%    | Big market with many potential buyers. Does it have broad appeal to a large audience?                                             |
| 6   | **Specific Niche**       | 8%     | Can be targeted to a specific community/audience. Product for specific people.                                                    |
| 7   | **Lightweight Shipping** | 7%     | Small weight, ships easily & cheaply. Low logistics costs for dropshipping.                                                       |

**Winning Score Threshold: ≥ 50/100**

Only products scoring 50 or higher are considered viable dropshipping candidates, but non-winning products are also included in the report so you can review possible scoring uncertainty, false positives, and false negatives before making a final decision. If a product URL is unavailable, the table cell stays blank.

**Manual Trigger:**

```bash
curl -X POST http://localhost:3000/products/auto-search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Or test it at:** `http://localhost:3000/products/auto-search` (with auth header)

Use the same endpoint with an auth header to run the autonomous discovery flow on demand.

---

## 📂 Project Structure

```text
ecommerce-agent/
├── backend/                  # NestJS API, domain logic, Prisma, auth, scheduling
│   ├── prisma/               # Prisma schema and migrations
│   ├── src/
│   │   ├── application/      # DTOs, ports, mappers, use cases
│   │   ├── composition/      # NestJS modules
│   │   ├── domain/           # Entities, value objects, domain services
│   │   ├── infrastructure/   # Controllers, adapters, repositories, auth, email
│   │   └── shared/           # Shared utilities and filters
│   └── tests/                # Backend tests
├── frontend/                 # Next.js dashboard and chat UI
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # API client helpers
│   │   └── styles/           # Global styles
│   └── tests/                # Frontend tests
├── services/                 # Python microservices
│   ├── common/               # Shared service code
│   ├── scraper/              # Product scraping worker
│   ├── social/               # Social media signal worker
│   └── detector/             # Product scoring and evaluation worker
├── docker/                   # Service-specific Dockerfiles
├── docker-compose.yml        # Local orchestration for the full platform
└── readme.md                 # Main project documentation
```

### Architecture Summary

- The backend coordinates searches, scoring, persistence, authentication, and email reporting.
- The frontend provides the dashboard and chat-based interaction layer.
- The Python services encapsulate specialized AI-assisted tasks: scraping, scoring, and social signal analysis.
- Docker Compose allows the whole system to run locally as a multi-service platform.

---

## ✨ Features

### Implemented Core Features

- User registration and login with JWT-based authentication.
- Manual product search by keyword.
- Autonomous scheduled product discovery workflow.
- Product scoring based on seven weighted winning-product criteria.
- Cross-platform and social-media verification flows used as decision signals.
- Bright Data credit-aware scraping with automatic fallback to Playwright when credits run low.
- Daily email report generation with winners and non-winners for review.
- Frontend dashboard and chat interface.
- Multi-service architecture using NestJS, Next.js, and Python workers.

### Planned or In-Progress Enhancements

- Harden production integrations for social-media sources.
- Improve cross-platform marketplace validation with live lookups.
- Expand deployment automation and monitoring.
- Add stronger URL validation/cleanup for future stale cache entries.
- Add a clearer report label for demo/fallback products so they are not confused with live discovery results.

---

## 🧪 Test Credentials

This project includes authentication. Before final TFM submission, replace the placeholders below with a working evaluator account.

Important: share only the demo user for the application. Do not share raw API keys or SMTP passwords in the README, repository, slides, or submission form.

```text
Demo User Email: [REPLACE_BEFORE_SUBMISSION]
Demo Password: [REPLACE_BEFORE_SUBMISSION]
```

If no seeded demo user is configured, you can create one locally from the API:

```bash
curl -X POST http://localhost:3000/auth/register \
   -H "Content-Type: application/json" \
   -d '{
      "email": "demo@example.com",
      "password": "Demo12345!"
   }'
```

After registration, log in using:

```bash
curl -X POST http://localhost:3000/auth/login \
   -H "Content-Type: application/json" \
   -d '{
      "email": "demo@example.com",
      "password": "Demo12345!"
   }'
```

---

## 🌍 Deployment

### Repository

- GitHub Repository: `https://github.com/obadazene/ecommerce-agent`
- Repository Visibility: Public recommended for TFM submission
- If private, grant access to: `mouredev@gmail.com`

### Application Access

- Production URL: `https://[YOUR-DEPLOY-URL]`
- Frontend Local URL: `http://localhost:3001`
- Backend Local URL: `http://localhost:3000`

### Evaluator Access Note

- If the application is deployed, the evaluator should test it using the public URL and the demo account above.
- If the application is not deployed, the evaluator can run it locally using this README and their own API keys in `.env`.
- Private secrets such as `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, and `SMTP_PASS` must never be shared publicly.

### Suggested Deployment Strategy

- Frontend: Vercel
- Backend: Render / Railway / Fly.io
- Database: PostgreSQL on Render / Neon / Supabase
- Python services: Render / Railway / Docker-based hosting

If a public deployment is not available at submission time, document the reason clearly and ensure the evaluator can run the project locally using this README.

---

## 🎞️ Video & Slides

Replace the placeholders below before submitting the TFM:

- Slides URL: `https://[YOUR-SLIDES-URL]`
- Video URL: `https://[YOUR-VIDEO-URL]`
- Deployment URL: `https://[YOUR-DEPLOY-URL]`

### Presentation Guidance

- The slides should explain the problem, architecture, stack, workflow, and demo results.
- The video should include a screen recording while you explain the project.
- Add these same public URLs to the submission form and keep them updated in this README.

---

## ✅ TFM Submission Checklist

Before sending the final project, verify that all required deliverables are ready:

- Complete README with overview, stack, installation, structure, features, and test credentials.
- Public GitHub repository URL, or justified private repository with access granted.
- Working deployment URL if available.
- Public slides URL.
- Public video URL.
- Test user credentials included in this README and in the submission form if login is required.

---

## 📄 License

This project was developed as a Master's Final Project (TFM) for academic evaluation. If you plan to publish it publicly, add the license that best matches your intended use.
