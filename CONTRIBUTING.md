# Contributing to HELPDESK.AI 🚀

First off, thank you for considering contributing to **HELPDESK.AI**! It’s contributors like you who help transform IT support from "Chaos to Clarity."

This guide outlines the professional standards and workflows required to maintain the integrity of our AI-powered ecosystem.

---

## 🏗️ Founding Team (Infosys Springboard - Group 2)

HELPDESK.AI was conceived and built during the **Infosys Springboard Virtual Internship 6.0**. We acknowledge the foundational work of the following team members:

### 👑 Leadership & Coordination
*   **Duniya Vasa** (Group Lead)
*   **Sowjanya N**

### 🧠 AI & Modeling
*   **Pragati Tiwari** (Lead)
*   **Shaik Eshak**
*   **Ippili Raju**
*   **Vinitha Giri**
*   **Asna Abdul Kareem**
*   **Ritesh Bonthalakoti**

### ⚙️ Backend Engineering
*   **Asmeet Kaur Makkad** (Lead)
*   **Vijayalakshmi S R**
*   **Dinesh Reddy Vasampelli**
*   **Manya Sahasra**

### 🎨 Frontend Engineering
*   **Satla Prayukthika** (Lead)
*   **Bandi Keerthi Krishna**
*   **Shubha G D**
*   **Phani Kotha**

### 📊 Data Engineering
*   **Praneetha Baru** (Lead)
*   **Kavin Sarvesh**
*   **Utukuri Naga Sri Hari Chandana**
*   **Akash Kumar Paswan**
*   **Ganesh Goud Tekmul**

---

## 📝 How to Contribute

### 1. Reporting Issues
Before opening a new issue, please search the [Existing Issues](https://github.com/ritesh-1918/HELPDESK.AI/issues) to ensure it hasn't been reported.

**When reporting a bug, please include:**
*   **Summary:** A clear and concise description of the bug.
*   **Steps to Reproduce:** Numbered list of steps.
*   **Expected vs. Actual Behavior:** What you expected to happen vs. what actually happened.
*   **Environment:** OS, Browser/Version, and Python version (if applicable).
*   **Screenshots:** Highly recommended for UI-related issues.

### 2. Suggesting Enhancements
We welcome ideas that improve the AI's precision or user experience.
*   Clearly explain the **Value Proposition**: How does this feature help the end-user?
*   Provide a brief technical overview of the proposed implementation.

---

## 🌟 GirlScript Summer of Code (GSSoC 2026)

We are proudly participating in **GSSoC 2026**! If you are a contributor from GSSoC, please ensure you follow these steps so that your PR is scored correctly:
1. **Target Branch Requirement (CRITICAL) 🚨**: You MUST target and submit all of your Pull Requests to the `gssoc` branch, **NOT** to the `main` branch. The `main` branch is our production-ready release branch and is strictly protected. Any Pull Request opened directly against `main` will be automatically rejected.
2. **Approval Label**: Once your PR is reviewed and approved, we will add the `gssoc:approved` label.
3. **Difficulty Level**: We will assign a difficulty label (`level:beginner`, `level:intermediate`, `level:advanced`, `level:critical`).
4. **Mentor Assignment**: We will add the `mentor:ritesh-1918` label to track review points.
5. Make sure your PR resolves an assigned issue and is linked properly in the PR description (e.g. `Fixes #28`).

---

## 🔐 GSSoC Integration Security Guide

Integration work touches third-party services, user data, and deployment secrets. Treat every integration PR as
security-sensitive, even when the change looks like a small provider, webhook, email, storage, or analytics update.

### Required Security Checks

Before opening an integration PR, verify the following:

*   **No secrets in code:** Never commit API keys, webhook secrets, OAuth client secrets, private URLs, `.env`
    files, or real tokens. Use environment variables and update `.env.example` with placeholder names only.
*   **Server-side trust boundary:** Keep privileged provider calls in the backend. Frontend code must not receive
    service-role keys, unrestricted provider tokens, or direct database write credentials.
*   **Webhook validation:** Webhook endpoints must verify signatures or shared secrets, reject missing/invalid
    signatures, and avoid logging raw payload secrets.
*   **OAuth and redirect safety:** OAuth callbacks must validate state/nonce values, use allowlisted redirect URLs,
    and avoid open redirects.
*   **CORS and origin scope:** Do not widen CORS to `*` for authenticated routes. Document any new allowed origin
    and why it is needed.
*   **Rate limits and retries:** Add rate limiting, timeout, and retry behavior for external APIs so a failing
    provider cannot exhaust backend resources.
*   **PII minimization:** Log request IDs and provider status, not passwords, tokens, email bodies, chat transcripts,
    or full customer records.
*   **Failure mode:** Integrations should fail closed for auth/security errors and return clear, non-sensitive error
    messages.

### PR Evidence Checklist

Include this evidence in the PR description for integration-security changes:

*   The new environment variables, with safe placeholder examples.
*   The trust boundary: browser, backend, provider, database, and webhook flow.
*   Validation steps for valid and invalid credentials or signatures.
*   Screenshots or logs with secrets redacted.
*   Any required deployment configuration changes for Vercel, Supabase, or backend hosting.

### Escalation Template

If you find a leaked credential, auth bypass, webhook spoofing issue, or unsafe direct database access, do not post
exploit details publicly. Use this template in the issue or PR with sensitive values redacted:

```text
Security integration concern

Area: <provider/webhook/OAuth/storage/email/analytics>
Impact: <what user data or system capability could be exposed>
Evidence: <redacted logs, file paths, or reproduction summary>
Suggested fix: <high-level mitigation without secrets>
Needs maintainer action: <yes/no, and why>
```

---

## 💻 Pull Request Process

We follow a strict "Production Ready" workflow. All PRs must meet the following criteria:

1.  **Branching Strategy (CRITICAL):**
    *   **All Pull Requests MUST target the `gssoc` branch.** Do not submit PRs directly to the `main` branch.
    *   For your local work, branch from `gssoc` using these naming conventions:
        *   `feature/` — New features or logic.
        *   `fix/` — Bug fixes.
        *   `docs/` — Documentation updates.
        *   `refactor/` — Code cleanup without functional changes.
2.  **Atomic Commits:** Each commit should be a small, logical unit of work with a descriptive message.
3.  **Performance Check:** Any changes to the backend must be tested to ensure inference times remain **strictly under 500ms**.
4.  **UI Consistency:** Frontend changes must strictly adhere to our "Chaos to Clarity" design system (Tailwind CSS + Framer Motion).
5.  **Documentation:** If you add a new feature, you must update `PLATFORM_MAP.md`.

---

## 🛠️ Technical Standards

### Python (Backend)
*   Follow **PEP 8** style guidelines.
*   Use type hints for all function signatures.
*   Ensure all new endpoints are documented via FastAPI's automatic Swagger/Redoc UI.

### JavaScript/React (Frontend)
*   Use functional components and hooks.
*   Maintain central state management via **Zustand**.
*   Ensure components are responsive across mobile, tablet, and desktop.

### AI & Data
*   Never commit raw datasets to the repository.
*   Ensure any model changes include a summary of evaluation metrics (F1-score, Accuracy).

---

## ⚖️ Code of Conduct
By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). We expect a professional, inclusive, and collaborative environment.

---
*Happy coding, and let’s drive the future of Intelligent Enterprise Support together!*
