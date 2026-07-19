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

The E-Commerce Agent is a personal product research assistant that automates the daily monitoring of AliExpress for products matching specific "Winning Product" criteria.

### Core Capabilities

| #   | Capability              | Description                                                                    |
| --- | ----------------------- | ------------------------------------------------------------------------------ |
| 1   | AliExpress Search       | Searches AliExpress daily based on given criteria                              |
| 2   | Cross-Platform Check    | Checks if product exists on Amazon, Shopify, WooCommerce, eBay                 |
| 3   | Social Media Monitoring | Searches TikTok, Instagram, Twitter, Facebook for mentions                     |
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

| Service          | Technology                                    |
| ---------------- | --------------------------------------------- |
| Scraper Service  | Python + FastAPI + BeautifulSoup + Playwright |
| Social Service   | Python + FastAPI + Gemini                     |
| Detector Service | Python + FastAPI + Mistral                    |

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

### 🔧 Environment Configuration

After copying `.env.example` to `.env`, configure the following values:

#### Required Configuration

| Variable          | Description                  | Example                                                  |
| ----------------- | ---------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db`               |
| `JWT_SECRET`      | Secret key for JWT tokens    | `random-32-char-string`                                  |
| `GEMINI_API_KEY`  | Google Gemini API key        | Get from [Google AI Studio](https://aistudio.google.com) |
| `GROQ_API_KEY`    | Groq API key for LLM         | Get from [Groq Console](https://console.groq.com)        |
| `MISTRAL_API_KEY` | Mistral API key              | Get from [Mistral Console](https://console.mistral.ai)   |

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
  - Searches AliExpress for trending products
  - Scores ALL products against winning criteria (7 criteria)
  - Filters products scoring ≥ 70
  - Checks if products exist on TikTok, Instagram, Twitter, Facebook
  - Sends email report with high-potential dropshipping products
  - **No keyword needed** - fully autonomous!

- `GET /products/auto-search/criteria` - View scoring thresholds & search parameters

### Manual Product Search (with keyword)

- `POST /products/search` - Search AliExpress with custom keyword
- `POST /products/manual-search` - Same as above
- `GET /products/new` - Find new products detected since last search

### Product Analysis

- `GET /products` - Get all products in database
- `GET /products/new` - Detect newly discovered products + send email

---

## 🤖 How Autonomous Discovery Works

**Every day at 5:00 AM UTC:**

```
1. AliExpress Search
   ↓ (No keyword needed - searches trending)
2. Product Scoring
   ↓ (Scores against 7 winning criteria)
3. Filter Winners
   ↓ (Keep only products scoring ≥ 70)
4. Social Media Check
   ↓ (Verify presence on TikTok, Instagram, Twitter, Facebook)
5. Send Email Report
   ↓ (Email with high-potential dropshipping products)
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

**Winning Score Threshold: ≥ 70/100**

Only products scoring 70 or higher are considered viable dropshipping candidates and included in daily email reports.

**Manual Trigger:**

```bash
curl -X POST http://localhost:3000/products/auto-search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Or test it at:** `http://localhost:3000/products/auto-search` (with auth header)

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
- Cross-platform verification flow for marketplace presence.
- Social media signal checking flow for product mentions.
- Daily email report generation.
- Frontend dashboard and chat interface.
- Multi-service architecture using NestJS, Next.js, and Python workers.

### Planned or In-Progress Enhancements

- Harden production integrations for social-media sources.
- Improve cross-platform marketplace validation with live lookups.
- Expand deployment automation and monitoring.

---

## 🧪 Test Credentials

This project includes authentication. Before final TFM submission, replace the placeholders below with a working evaluator account.

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
