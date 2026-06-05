# Security Policy — HELPDESK.AI

## Overview

HELPDESK.AI takes the security of our software seriously. This document describes
our supported versions, how to report a vulnerability privately, what to expect
after reporting, and the scope of our security program.

If you believe you have found a security vulnerability, **please do not open a
public GitHub issue**. Use the private reporting process described below.

---

## Supported Versions

We provide security updates for the following versions:

| Version | Status             | Notes                                          |
|---------|--------------------|------------------------------------------------|
| 1.2.x   | ✅ Actively patched | Current stable — all security fixes backported |
| 1.1.x   | ⚠️ Critical only   | Only critical (CVSS ≥ 9.0) vulnerabilities    |
| 1.0.x   | ❌ End of life      | No further security updates                    |
| < 1.0   | ❌ End of life      | No further security updates                    |

If you are on an unsupported version, upgrade to `1.2.x` before reporting.

---

## Reporting a Vulnerability

### Option 1 — GitHub Private Security Advisory (Preferred)

Use GitHub's built-in private vulnerability reporting:

1. Go to: https://github.com/ritesh-1918/HELPDESK.AI/security/advisories/new
2. Fill in the advisory form with as much detail as possible (see template below)
3. Submit — only repository maintainers can see it

This is the preferred method because it keeps the disclosure private, allows
maintainers to draft a fix before public disclosure, and automatically creates
a CVE if needed.

### Option 2 — Encrypted Email

If you cannot use GitHub's advisory system, email the maintainer via the contact
on their [GitHub profile](https://github.com/ritesh-1918).
Include `[SECURITY]` in the subject line.

---

## What to Include in Your Report

Please include as much of the following as possible:

```
Vulnerability Type:
  (e.g. XSS, SQL injection, authentication bypass, IDOR, RCE, DoS)

Affected Component:
  (e.g. backend/main.py, Frontend/src/services/api.js, MobileApp)

Affected Version(s):
  (e.g. 1.1.x, all versions, only when ENVIRONMENT=production)

Attack Vector:
  (e.g. unauthenticated HTTP request, authenticated user, local access only)

Impact:
  (e.g. data exfiltration, privilege escalation, service disruption)

Steps to Reproduce:
  1. ...
  2. ...
  3. ...

Proof of Concept (optional but helpful):
  (curl command, code snippet, or screenshot)

Suggested Fix (optional):
  (if you have an idea for the root cause)

Your Name / Handle (for attribution in the advisory):
  (can be anonymous)
```

---

## What Happens After You Report

| Timeline           | What We Do                                                   |
|--------------------|--------------------------------------------------------------|
| Within 48 hours    | Acknowledge receipt and confirm we can reproduce the issue   |
| Within 7 days      | Provide an initial severity assessment (CVSS score estimate) |
| Within 30 days     | Deliver a patch for critical/high severity vulnerabilities   |
| Within 90 days     | Deliver a patch for medium/low severity vulnerabilities      |
| Before disclosure  | Notify you before the advisory is made public               |
| After patch ships  | Credit you in the advisory (unless you prefer anonymous)     |

If we cannot reproduce the issue or determine it is not a security vulnerability,
we will explain why and close the advisory. You may reopen if you have additional
information.

---

## Scope

### In Scope

We consider the following in scope for security reports:

- **Backend API** (`backend/`) — authentication bypass, injection attacks, IDOR,
  insecure deserialization, privilege escalation, DoS via resource exhaustion
- **Frontend** (`Frontend/`) — XSS, CSRF, sensitive data in localStorage/sessionStorage,
  open redirect, clickjacking via missing security headers
- **MobileApp** (`MobileApp/`) — hardcoded credentials, insecure data storage,
  certificate pinning bypass, improper authentication
- **AI/ML pipeline** — prompt injection, model data poisoning if exploitable
- **Infrastructure** — Docker misconfigurations, exposed environment variables,
  secrets in repository history

### Out of Scope

The following are **not** eligible for security reports:

- Vulnerabilities in third-party dependencies (report to the dependency maintainer)
- Self-XSS (requires the attacker to execute their own code in their own browser)
- Social engineering attacks against maintainers or users
- Findings from automated scanners without proof of exploitability
- Rate limiting on non-sensitive endpoints (e.g., GET /health)
- Vulnerabilities that require physical access to the server
- Issues in the development environment that cannot affect production

---

## Severity Definitions

We use CVSS v3.1 for scoring:

| CVSS Score | Severity | Target Patch Time |
|------------|----------|--------------------|
| 9.0 – 10.0 | Critical | 7 days             |
| 7.0 – 8.9  | High     | 14 days            |
| 4.0 – 6.9  | Medium   | 30 days            |
| 0.1 – 3.9  | Low      | 90 days            |
| 0.0        | None     | Next release       |

---

## Vulnerability Disclosure Policy

We follow **coordinated disclosure**:

1. You report privately
2. We confirm and patch
3. We publish the advisory (and CVE if applicable) after the patch ships
4. We credit you by name/handle unless you prefer anonymous

We ask that you:

- Give us a reasonable time to patch before any public disclosure
- Not exploit the vulnerability beyond proof of concept
- Not access or modify user data beyond what is necessary to demonstrate the issue
- Not disrupt the service for other users

We commit to:

- Not taking legal action against researchers who follow this policy
- Keeping you informed throughout the remediation process
- Crediting you publicly for valid reports (with your consent)

---

## Known Security Mitigations

The following security controls are already in place:

| Area                          | Control                                              |
|-------------------------------|------------------------------------------------------|
| API authentication            | JWT-based auth with Supabase                         |
| Secret management             | Environment variables — no hardcoded secrets in code |
| Input validation              | Pydantic validators on all API request bodies        |
| Image upload size limits      | Max 8MB enforced at middleware and validator layer    |
| CORS                          | Env-driven allowlist — no wildcard in production     |
| Security headers              | CSP, X-Frame-Options, HSTS, X-Content-Type-Options   |
| Dependency scanning           | Dependabot alerts enabled                            |
| Container security            | Non-root user in production Docker image             |

---

## Attribution

We are grateful to all security researchers who responsibly disclose vulnerabilities.
Contributors who report valid security issues will be acknowledged in the security
advisory unless they prefer to remain anonymous.

Thank you for helping keep HELPDESK.AI safe and secure for all users!

---

*Last updated: June 2026 | Maintainer: [@ritesh-1918](https://github.com/ritesh-1918)*
