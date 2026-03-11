<div align="center">

# `H E L P D E S K . A I`
**The Intelligent Standard for Enterprise IT Service Management**

[![Vercel Deployment](https://img.shields.io/badge/Project-Live_Deployment-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://helpdeskaiv1.vercel.app/)
[![Backend Engine](https://img.shields.io/badge/Backend-AI_Inference-FF8C00?style=for-the-badge&logo=huggingface&logoColor=black)](https://huggingface.co/spaces/ritesh19180/ai-helpdesk-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

### ⚡ Professional IT Support, Reimagined by AI.
*Helpdesk.ai eliminates manual triage by instantly categorizing, prioritizing, and routing tickets using deep-learning neural networks.*

[View the Demo](https://helpdeskaiv1.vercel.app/) • [Enterprise Hub](https://helpdeskaiv1.vercel.app/contact-sales) • [API Documentation](https://ritesh19180-ai-helpdesk-api.hf.space/docs)

</div>

<br/>

## 💎 The Enterprise Edge

Most IT desks suffer from "Manual Bottleneck"—the slow process of a human reading and routing every single ticket. **Helpdesk.ai** replaces that delay with millisecond-precision AI analysis.

### 🧠 Neural Core Features
- **Smart Triage Architecture**: Driven by a fine-tuned **DistilBERT** model that predicts category and priority level with context-aware sentiment analysis.
- **Entity Extraction (NER)**: Automatically pulls software names, server IDs, and locations directly from "messy" user descriptions.
- **Semantic Duel-Check**: Real-time duplicate detection prevents ticket floods during known system outages by grouping similar reported issues.
- **Enterprise Hub**: A dedicated lead-capture pipeline for organizations requiring dedicated infra, SLAM, and custom model weights.

---

## 🏗️ System Architecture

Our stack is built for high-concurrency production environments, leveraging a decoupled microservices architecture.

```mermaid
graph TD
    User([End User]) -- "Natural Language" --> FE[React 19 / Vite]
    FE -- "Secure API" --> BE[FastAPI / Python]
    BE -- "Tokenize" --> AI{AI Inference Engine}
    AI -- "DistilBERT" --> Cat[Categorization]
    AI -- "Spacy/HF" --> NER[Entity Extraction]
    AI -- "Similarity" --> Dup[Duplicate Detection]
    Cat & NER & Dup --> DB[(Supabase / Postgres)]
    DB -- "Websockets" --> Adm([Admin Portal])
```

<br/>

## 🛠️ The Tech Ecosystem

We use only the most modern, industry-standard tools to ensure reliability and scalability.

| Layer | Tools |
| :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react) ![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat-square&logo=vite) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css) ![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer) |
| **Backend** | ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi) ![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=flat-square&logo=python) ![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&logo=pytorch) |
| **Infrastructure** | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel) ![Stripe](https://img.shields.io/badge/Stripe-008CDD?style=flat-square&logo=stripe) |

---

## 💼 New Features

### 💳 Stripe Subscription Flow
We've integrated a seamless checkout experience for Growth teams. 
- **Redirect Engine**: A custom loading UI protects the transition from local state to secure Stripe Payment Links.
- **Tier Management**: Instant switching between Starter and Growth tiers.

### 🏢 Enterprise Lead Hub
A bespoke portal designed for B2B engagement. 
- **Secure Persistence**: Leads are captured directly into an RLS-protected Supabase table.
- **Custom Architect Consults**: Integrated form for high-volume organizations to request dedicated infra and compliance VAPT reports.

---

## 🚀 Deployment & Local Setup

### 1. Prerequisites
- Node.js v18.x+
- Python 3.10+
- Supabase Project

### 2. Environment Configuration
Create a `.env` in the `Frontend/` directory:
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_STRIPE_GROWTH_LINK=https://buy.stripe.com/test_...
VITE_BACKEND_URL=http://localhost:8000
```

### 3. Installation
```bash
# Clone and install
git clone https://github.com/ritesh-1918/HELPDESK.AI.git
cd HELPDESK.AI/Frontend
npm install

# Start Development
npm run dev
```

---

<div align="center">

Built with ❤️ by the **HELPDESK.AI** Team  
*Empowering IT Teams with Artificial Intelligence.*

</div>
