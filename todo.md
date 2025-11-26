# Todo: Features & Improvements

## Features

- [ ] Conversation history with full‑text search and pinned threads
- [ ] Streaming responses with cancel/resume and partial renders
- [ ] Web search integration with source citations
- [ ] Code runner sandbox for small snippets (Node/TS) with resource limits
- [ ] File reader tool for large docs (chunking + summarization)
- [ ] Project share links with permissions, expiry, and revocation
- [ ] Export of conversations (Markdown, PDF, JSON) and import from JSON
- [ ] Server‑side rate limiting and per‑plan quotas
- [ ] Prompt library with tags, search, and favorites
- [ ] Creation versioning with diff and rollback
- [ ] Fork/duplicate creation into new project
- [ ] Template gallery (community and curated templates)
- [ ] Model selection and parameters (temperature, max tokens, safety)
- [ ] Webhooks for creation events (generated, refined, exported)
- [ ] Autosave with conflict resolution for multi‑tab editing
- [ ] Saved views/filters for creations and folders
- [x] Onboarding tour and sample projects
- [ ] Notifications (in‑app toasts and email for long tasks)
- [ ] Internationalization (i18n) and localization
- [ ] Dark mode and theme customization
- [ ] Public API for programmatic creation/export
- [ ] Plugin API for custom tools
- [ ] Publishing to Netlify/Vercel directly from exports
- [ ] Project analytics dashboard (usage, token cost, errors)
- [ ] Offline support for drafts with sync on reconnect

## Improvements

- [ ] Robust error handling: retries, timeouts, circuit breaker for AI calls
- [ ] Observability: structured logs, metrics (latency, token usage), tracing
- [ ] Env/config schema validation (required keys, defaults, secrets policy)
- [ ] Security: CORS, security headers, SSRF protection, webhook signature checks
- [ ] Performance: response streaming, caching hot requests, code‑splitting
- [ ] Accessibility: focus management, ARIA roles/labels, color contrast audit
- [ ] UX polish: skeleton loaders, optimistic updates, undo/redo
- [ ] Testing: unit/integration/e2e with mocked AI; coverage thresholds
- [ ] CI/CD: GitHub Actions for lint, typecheck, test, build, preview deploy
- [ ] Deployment: Dockerfile, compose, health/readiness probes, autoscaling
- [ ] Database: Prisma indexes, constraints, migrations automation, seed scripts
- [ ] Backup & restore procedures for creations and folders
- [ ] Data retention and cleanup jobs
- [ ] Compliance: privacy, GDPR data export/delete flows
- [ ] Security audits and dependency vulnerability scanning
- [ ] Feature flags for progressive rollouts
- [ ] Bundle analysis and asset optimization (images/fonts)
- [ ] CDN integration and cache headers
- [ ] Error boundaries and graceful degradation across components
- [ ] Rate limiting quotas aligned to plan tiers
- [ ] Billing proration and refund handling
- [ ] Audit logs for admin review
- [x] Keyboard shortcuts for power users
- [x] Idle/timeout handling for long‑running tasks (2min generation, 1.5min refinement)

## Short-Term Priorities

- [ ] Stream responses in UI and handle cancel
- [ ] Centralized error boundary with user-friendly messages
- [ ] Env schema to ensure `GEMINI_API_KEY` and required settings
- [ ] Add CORS and security headers to the server
- [ ] Implement server‑side rate limiting (IP + user)
- [ ] Unit tests for `services/gemini.ts` and `server/index.js`

## Medium-Term Priorities

- [ ] Role‑based access control (RBAC)
- [ ] Conversation search and pinned threads
- [ ] Share links with permissions and expiry
- [ ] CI pipeline with preview environments
- [ ] Dockerize app and define deployment runbooks
- [ ] Full e2e test suite covering creation → export flows

## Long‑Term Vision

- [ ] Plugin marketplace for community tools
- [ ] Public REST/GraphQL API and auth for third‑party apps
- [ ] Multi‑provider LLM abstraction and fallback routing
- [ ] Desktop app (Electron) for local development workflows
- [ ] Mobile app (React Native) for on‑the‑go edits
- [ ] Self‑hosting mode with simplified setup
- [ ] Data warehouse + analytics for product insights
