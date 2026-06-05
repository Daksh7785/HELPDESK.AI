# Helpdesk.ai Platform: Application Map

This document provides a comprehensive breakdown of all 30+ pages and interaction states across the Helpdesk.ai ecosystem.

## 🏢 Layer 1: Public & Authentication
| Page | Description | Key Features |
| :--- | :--- | :--- |
| **Landing Page** | The public storefront. | Premium "Chaos to Clarity" journey, Pricing tiers, FAQ, Video Demo. |
| **Contact Sales** | Enterprise lead capture. | Custom dropdowns, direct persistence to Supabase. |
| **Login / Signup** | User & Admin entry points. | Secure JWT-based entry, Role-aware redirection. |
| **Forgot/Reset Password** | Recovery workflows. | Email-based secure recovery flows. |
| **Knowledge Check** | Pre-support interactive guide. | Self-service assessment before ticket submission. |

## 👤 Layer 2: Standard User Portal
| Page | Description | Key Features |
| :--- | :--- | :--- |
| **User Lobby** | Central entry point for employees. | Quick-start actions, high-level ticket status. |
| **Create Ticket** | The core submission engine. | AI Processing simulator, OCR image analysis, semantic duplicate detection, parent-ticket warnings. |
| **My Tickets** | Personal ticket ledger. | Live status tracking, filterable history. |
| **Ticket Detail** | Deep-dive into a specific issue. | Timeline tracking, resolution summaries. |
| **AI Processing** | Real-time analysis view. | Visual feedback of DistilBERT and NER extraction in progress, semantic duplicate scoring. |
| **Auto-Resolve** | AI troubleshooting hub. | Interactive chat for self-resolution. |
| **Notifications** | Activity center. | Real-time updates on ticket movement. |
| **User Profile** | Identity management. | Personal details, company affiliation. |

## 🏢 Layer 3: Company Admin Portal
| Page | Description | Key Features |
| :--- | :--- | :--- |
| **Admin Lobby** | Central IT management hub. | Quick metrics (Pending, Resolved, Critical). |
| **Admin Tickets** | Organizational ticket queue. | Bulk actions, advanced filtering, priority management. |
| **Admin Users** | Workforce management. | Invite-only onboarding, user role auditing. |
| **Admin Analytics** | Performance dashboard. | Sentiment heatmaps, tech-stack recurring issue analysis. |
| **Admin Settings** | Organizational configuration. | Custom branding, SLA threshold definitions. |
| **Admin Profile** | Managerial settings. | Administrative credentials and settings. |

## 👑 Layer 4: Master Admin Portal
| Page | Description | Key Features |
| :--- | :--- | :--- |
| **Master Login** | God-mode entry point. | Restricted access for platform owners. |
| **Master Dashboard** | Global orchestration hub. | Cross-tenant health monitoring, active company count. |
| **All Companies** | Tenant management. | Add/Verify new organizations, manage infrastructure links. |
| **All Admins** | Administrator directory. | Cross-company admin auditing. |
| **Pending Requests** | Onboarding queue. | Approve/Reject new company registrations. |
| **Master Bug Reports** | Platform diagnostics. | System-wide error tracking and resolution. |

## 🤖 Layer 5: AI/ML Operations (Active Learning Pipeline — Issue #1931)
| Component | Description | Key Features |
| :--- | :--- | :--- |
| **Active Learning Service** | `backend/services/active_learning_service.py` | Telemetry-enriched correction logging, hard-negative mining, dataset balancing, model registry, rollback |
| **Retraining Pipeline** | `backend/training/retraining_pipeline.py` | DistilBERT fine-tuning, weighted hard-negative loss, validation gate (≥2% gain), automatic backup & promotion |
| **Active Learning Router** | `backend/routes/active_learning.py` | 11 REST endpoints: retrain, status, registry, rollback, promote, annotation pool, drift stats |
| **Bi-Weekly GitHub Action** | `.github/workflows/retrain-classifier.yml` | Scheduled retraining every other Sunday, dry-run support, artefact commit |
| **Low-Confidence Pool** | `GET /active-learning/pool` | Human-in-the-loop annotation queue sorted by ascending confidence |
| **Model Registry** | `backend/data/model_registry.json` | Full version history with accuracy, training samples, promotion status |

---
*Documented with millisecond precision for Helpdesk.ai Platform.*
