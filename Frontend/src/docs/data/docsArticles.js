export const DOCS_CATEGORIES = [
  { id: 'getting-started', title: 'Getting Started', icon: 'Rocket' },
  { id: 'ticket-flow', title: 'Ticket Flow & AI', icon: 'Cpu' },
  { id: 'admin-guide', title: 'Admin & Settings', icon: 'Sliders' },
  { id: 'troubleshooting', title: 'Troubleshooting', icon: 'AlertTriangle' },
];

export const DOCS_ARTICLES = [
  {
    id: 'intro',
    categoryId: 'getting-started',
    title: 'Platform Introduction',
    description: 'Overview of the AI-powered IT helpdesk ticket automation system.',
    tags: ['overview', 'architecture'],
    content: `
# Platform Introduction
Welcome to **HELPDESK.AI**—a next-generation automated IT Support Platform powered by custom local machine learning models and robust LLM failover pipelines.

HELPDESK.AI classifies, prioritizes, and routes incoming IT queries instantly without human intervention. If the AI determines that an issue matches a verified fix from our knowledge base, it auto-resolves the ticket dynamically!

### ⚡ Main Pillars of the Platform:
1. **AI Ingestion**: Captures text and screenshot telemetry from user inputs.
2. **NER (Named Entity Recognition)**: Extracts system hostnames, IP addresses, error codes, and library names.
3. **Automated Triage**: Predicts the ticket category, subcategory, priority level, and routes it to the optimal engineering unit.
4. **Auto-Resolution (RAG)**: Scans historically solved cases and knowledge articles, prompting users with step-by-step resolution playbooks.
    `,
  },
  {
    id: 'access-roles',
    categoryId: 'getting-started',
    title: 'User Roles & Access Levels',
    description: 'Understand differences between End Users, Support Agents, and Admins.',
    tags: ['auth', 'roles'],
    content: `
# User Roles & Access Levels
HELPDESK.AI enforces tenant-scoped access mapping across three core authorization levels:

### 👥 1. End User
* **Dashboard Access**: Report new issues via voice or text.
* **Timeline Tracking**: Monitor real-time progress of submitted tickets.
* **Interactive Chat**: Directly correspond with assigned agents and support teams.

### 🛠️ 2. Support Agent
* **Divert Protocol**: Forward tickets to other units or claim them to move to an "In Progress" status.
* **Override Labels**: Manually edit categories, subcategories, or priority levels to retrain and log AI corrections.
* **Resolution Action**: Resolve active support incidents cleanly.

### 👑 3. Master Admin
* **System Operations**: Complete company registration directories, clearance directories, and system audit logs.
    `,
  },
  {
    id: 'ticket-creation',
    categoryId: 'ticket-flow',
    title: 'Ingestion & Speech-to-Text',
    description:
      'How to file tickets, capture details using voice, and extract text from attachments.',
    tags: ['voice', 'ocr', 'tickets'],
    content: `
# Ingestion & Speech-to-Text
Creating a ticket is fully optimized for speed and completeness through advanced frontend features.

### 🎙️ 1. Dictation & Voice Assistant
Click the **Microphone** icon in the **Voice Assistant** panel to dictate your issue.
- The web app dynamically invokes the browser's \`webkitSpeechRecognition\` framework.
- It displays a Siri-style audio visualizer showing live voice amplitude on-screen.
- Clicking **Done** appends the transcribed speech directly to the description textarea.

### 📸 2. Image Upload & OCR
Drag and drop or click to upload a JPEG/PNG screenshot of the system error.
- The frontend triggers **Tesseract.js** to run optical character recognition locally inside the browser.
- All extracted text is captured under \`ocr_text\` and sent to the LLM to understand technical signals.
    `,
  },
  {
    id: 'system-settings',
    categoryId: 'admin-guide',
    title: 'Managing System Settings',
    description: 'Configure confidence limits and duplicate sensitivities dynamically.',
    tags: ['settings', 'admin'],
    content: `
# Managing System Settings
Support agents can tweak active settings on the **System Settings** page to align the automated routing behavior with operational guidelines.

### ⚙️ Adjusting AI Thresholds:
* **AI Confidence Threshold**: Controls whether a ticket can be automatically resolved or must be reviewed by a human. If the AI's confidence is below this limit, the ticket defaults to a \`pending_human\` review.
* **Duplicate Sensitivity**: Calibrates the semantic search limits when checking incoming tickets against previous issues. Higher sensitivity matches tickets only with extremely high textual similarity.
* **Auto-Resolve Toggle**: Enables or completely disables automated closing.
    `,
  },
  {
    id: 'api-response-payload-schema',
    categoryId: 'api-reference',
    title: 'API Response Payload Schema',
    description: 'Reference schemas for core backend response payloads and error shapes.',
    tags: ['api', 'schema', 'responses', 'gssoc'],
    content: `
# API Response Payload Schema
This guide documents the response shapes returned by the core HELPDESK.AI backend endpoints. Use it when wiring frontend views, tests, or integration clients.

> Base URL: use \`VITE_BACKEND_URL\` from the frontend environment, or the locally running FastAPI service URL during development.

## Common Error Response
FastAPI returns this shape for validation errors and explicit failures:

\`\`\`json
{
  "detail": "Database connection not initialized"
}
\`\`\`

Validation failures may return \`detail\` as an array of field errors instead of a string.

## GET /health

\`\`\`json
{
  "status": "ok",
  "classifier_loaded": true,
  "ner_loaded": true
}
\`\`\`

- \`status\`: process health, usually \`ok\`.
- \`classifier_loaded\`: whether the classifier singleton loaded successfully.
- \`ner_loaded\`: whether the NER singleton loaded successfully.

## GET /ready

\`\`\`json
{
  "status": "ready",
  "checks": {
    "api": true,
    "classifier_loaded": true,
    "ner_loaded": true,
    "duplicate_index_loaded": true,
    "rag_loaded": true,
    "supabase_configured": true
  }
}
\`\`\`

\`supabase_configured\` is present only when \`REQUIRE_SUPABASE=true\`.

## POST /ai/analyze and POST /ai/analyze_ticket
Both endpoints return the \`TicketResponse\` analysis payload. \`/ai/analyze\` is read-only. \`/ai/analyze_ticket\` is rate limited and delegates to the same analysis flow.

\`\`\`json
{
  "id": null,
  "ticket_id": "7cc6e8ef-b5d9-4615-a349-1d629154e7c6",
  "summary": "VPN connecting error 789 on router",
  "category": "Network",
  "subcategory": "VPN Failure",
  "priority": "High",
  "auto_resolve": false,
  "assigned_team": "Network Ops",
  "entities": [
    { "text": "VPN", "label": "TECHNOLOGY", "confidence": 0.94 }
  ],
  "duplicate_ticket": {
    "is_duplicate": false,
    "duplicate_ticket_id": null,
    "similarity": 0.0
  },
  "confidence": 0.96,
  "needs_review": false,
  "reasoning": "Categorized as 'Network' - VPN Failure.",
  "decision_factors": ["High confidence match for 'VPN Failure'"],
  "image_description": "",
  "ocr_text": "",
  "image_url": null,
  "highlights": [
    { "text": "VPN", "label": "TECHNOLOGY", "confidence": 0.94 }
  ],
  "timeline": {
    "received": "2026-06-05T12:00:00Z",
    "ai_analyzed": "2026-06-05T12:00:00Z",
    "triaged": "2026-06-05T12:00:00Z",
    "metadata_harvested": "2026-06-05T12:00:00Z",
    "routed": "2026-06-05T12:00:00Z"
  },
  "env_metadata": {
    "timestamp": "2026-06-05T12:00:00Z",
    "model_version": "3.0.0-PRO",
    "api_endpoint": "/ai/analyze"
  },
  "sla_breach_at": "2026-06-05T20:00:00Z",
  "version": "2.1.0-Neural-Diagnostic"
}
\`\`\`

### Ticket Analysis Fields
- \`ticket_id\`: temporary UUID for preview analysis.
- \`summary\`: AI or fallback summary of the ticket text.
- \`category\`, \`subcategory\`, \`priority\`: predicted triage labels.
- \`auto_resolve\`: true only when auto-resolution is enabled and confidence rules pass.
- \`assigned_team\`: routing team selected by category or RAG match.
- \`entities\`: extracted entities, each with \`text\`, \`label\`, and \`confidence\`.
- \`duplicate_ticket\`: duplicate detection result with \`is_duplicate\`, \`duplicate_ticket_id\`, and \`similarity\`.
- \`confidence\`: classifier confidence from \`0.0\` to \`1.0\`.
- \`needs_review\`: true when confidence is below the active threshold.
- \`decision_factors\`: concise evidence used for the decision.
- \`timeline\`: ISO timestamps for analysis milestones.
- \`env_metadata\`: request or model metadata for diagnostics.
- \`sla_breach_at\`: ISO timestamp generated from priority SLA rules.

## POST /ai/analyze_stream
Streams Server-Sent Events instead of one JSON document. Parse each SSE \`data:\` line independently and handle disconnects gracefully.

## POST /tickets/save
Persists a reviewed ticket analysis to Supabase and creates the initial system message.

\`\`\`json
{
  "status": "success",
  "ticket_id": "8f4e8d46-6b0d-46f9-b5c0-4fd4a98cb8f4",
  "duplicate_indexed": true
}
\`\`\`

If duplicate indexing fails but the ticket is saved, the response includes \`duplicate_index_warning\`.

## GET /tickets
Returns an array of persisted ticket records from Supabase, ordered newest first. The exact columns mirror the \`tickets\` table, so consumers should treat unknown keys as forward-compatible metadata.

## GET /tickets/{ticket_id}
Returns one persisted ticket record. Missing records return \`404\` with \`{ "detail": "Ticket not found" }\`.

## Auth Endpoints

### POST /auth/login
\`\`\`json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "admin"
  },
  "message": "Session cookies set"
}
\`\`\`

### POST /auth/signup
\`\`\`json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "user"
  },
  "message": "Signup complete"
}
\`\`\`

### POST /auth/logout
\`\`\`json
{ "ok": true }
\`\`\`

### GET /auth/me
\`\`\`json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "user"
  }
}
\`\`\`

## Contributor Checklist
- Keep frontend consumers tolerant of extra response fields.
- Treat \`detail\` as either a string or an array for error handling.
- Do not assume Supabase-backed endpoints are available in degraded local mode.
- Use \`confidence\`, \`needs_review\`, and \`decision_factors\` together when explaining AI decisions to users.
    `
  },
  {
    id: 'troubleshooting-connections',
    categoryId: 'troubleshooting',
    title: 'API & Connection Failures',
    description: 'How to troubleshoot Supabase or backend timeout errors.',
    tags: ['database', 'network', 'timeout'],
    content: `
# API & Connection Failures
If you encounter timeout issues or connection alerts, review the diagnostic guide below.

### 🔴 1. Supabase Initialization Failures
**Symptom**: Console logs show \\\`[Supabase] Client is disabled. Set valid VITE_SUPABASE_URL...\\\`
- **Resolution**: Verify that the \\\`.env\\\` file in the \\\`Frontend/\\\` folder contains your valid project URL and anon keys.
- **Vite Cache**: Run \\\`npm run dev\\\` again to make sure the environment changes are rehydrated in your web browser.

### 🔴 2. Backend Model degraded startup
**Symptom**: The AI Ingestion pipeline displays an warning about SentenceTransformer load errors.
- **Resolution**: The backend includes **self-healing fallback modules** that automatically bypass local ML loading on low-RAM servers, utilizing the API Failover module to ensure 100% platform availability.
    `,
  },
];
