# Development Guide — HELPDESK.AI

## 🚀 Quick Start

```bash
git clone https://github.com/ritesh-1918/HELPDESK.AI.git
cd HELPDESK.AI

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
uvicorn main:app --reload

# Frontend
cd ../Frontend
npm install
npm run dev
```

## 📁 Project Structure

```
HELPDESK.AI/
├── backend/           # FastAPI backend
│   ├── main.py        # API entry point
│   ├── services/      # AI services (Gemini, Classifier)
│   └── .env           # Environment config (git-ignored)
├── Frontend/          # Next.js + Tailwind
│   ├── src/
│   │   ├── pages/     # Route pages
│   │   ├── components/# Reusable UI
│   │   ├── services/  # API client layer
│   │   └── store/     # Zustand state management
│   └── tailwind.config.js
├── docs/              # Documentation
└── MobileApp/         # Android app
```

## 🏷️ Branch Naming

| Type | Prefix | Example |
|------|--------|---------|
| Feature | `feat/` | `feat/dark-mode` |
| Bug Fix | `fix/` | `fix/scrollbar-wcag` |
| Docs | `docs/` | `docs/escalation-guide` |
| Test | `test/` | `test/classifier-coverage` |

## ✅ PR Checklist

- [ ] Linked to an open issue (e.g., `Closes #123`)
- [ ] Code follows existing style conventions
- [ ] Backend: tested with `pytest` if applicable
- [ ] Frontend: `npm run build` passes
- [ ] No new console warnings or errors

---

## 🎓 GSSoC Contributor Guide

Welcome GSSoC contributors! This section covers GSSoC-specific workflows.

### Getting Assigned

1. Comment `/assign` on the issue you want to work on
2. Wait for the maintainer or GSSoC bot to assign it to you
3. Start working AFTER assignment

### Bounty Label Meanings

| Label | Difficulty | Expected Effort |
|-------|-----------|----------------|
| `level:beginner` | Entry-level | 30 min - 2 hours |
| `level:intermediate` | Moderate | 2 - 6 hours |
| `level:critical` | Advanced | 6 - 24 hours |

---

## 📋 GSSoC Escalation Templates

Use these templates when you need to escalate an issue through the contributor support chain.

### Level 1 — Issue Stuck (Contact: Issue Assigner)

> Use when: Your assigned issue has no response for 48+ hours, or you're blocked by missing information.

```
**Subject:** Follow-up on Issue #[issue-number] — [your-name]

Hi @[assigner-name],

I'm following up on issue #[issue-number] ("[issue-title]") which has been
assigned to me since [date]. I have [completed drafting the fix / need
clarification on: _______].

Could you please [review / provide guidance on: _______]?

Thank you!
```

### Level 2 — PR Stuck in Review (Contact: Project Admin)

> Use when: Your PR has been open for 72+ hours with no review, or the reviewer requested changes and hasn't responded to your update.

```
**Subject:** PR #[pr-number] Stuck in Review — [issue-number]

Hi @ritesh-1918,

PR #[pr-number] for issue #[issue-number] ("[issue-title]") has been open
for [X] days without a final review.

Checks status: [CI pass / Vercel pending]
Changes: [brief summary of what the PR does]

Could you please trigger a review or let me know if any changes are needed?

Thanks for your time.
```

### Level 3 — Program-Level Escalation (Contact: GSSoC Program Manager)

> Use when: An issue has been unresolved for 7+ days despite Level 1 and Level 2 escalations, OR the issue involves a policy violation.

```
**Subject:** GSSoC Escalation — Issue #[issue-number] in ritesh-1918/HELPDESK.AI

Hello GSSoC Team,

I'm escalating issue #[issue-number] ("[issue-title]") in the HELPDESK.AI
repository after following the project's escalation process:

- Level 1 (Issue Assigner): Contacted on [date] — [response status]
- Level 2 (Project Admin): Contacted on [date] — [response status]

Issue details:
- Repository: https://github.com/ritesh-1918/HELPDESK.AI
- Issue link: https://github.com/ritesh-1918/HELPDESK.AI/issues/[number]
- Assigned since: [date]
- Current status: [describe the block]

Thank you for your assistance.
```

### Level 4 — Code of Conduct Violation

> Use when: You witness harassment, discrimination, or any CoC violation. Report privately to the project maintainer first.

```
**Subject:** [PRIVATE] Code of Conduct Concern

Hi @ritesh-1918,

I need to report a Code of Conduct concern regarding [describe the situation
factually, without speculation].

The incident occurred in: [issue link / PR link / discussion link]

I'm reporting this privately per our Code of Conduct policy.

Thank you for handling this.
```

---

## 📞 Support Contacts

| Role | GitHub | Response SLA |
|------|--------|-------------|
| Project Maintainer | [@ritesh-1918](https://github.com/ritesh-1918) | 48 hours |
| GSSoC Mentor | Contact via GSSoC Discord | 72 hours |
| GSSoC Program Team | [GSSoC Support](https://gssoc.girlscript.org) | 5 business days |

## 🔗 Resources

- [HELPDESK.AI Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [GSSoC Official Site](https://gssoc.girlscript.org)
