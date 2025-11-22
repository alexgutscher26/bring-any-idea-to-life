<div align="center">
<img width="1200" height="475" alt="BringSuite Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BringSuite — Bring Any Idea to Life

BringSuite is a React + Vite application with a lightweight Node server that turns ideas and images into working multi‑file web projects using Gemini. It supports sign‑in, saving creations to a database, refining, previewing, exporting to frameworks, folders, and Stripe‑powered upgrades.

## Features

- Generate multi‑file apps from text or image input
- Refine existing projects iteratively
- Live preview with error boundary
- Save creations and organize them in folders
- Export to React/Vue project structure
- Sign in/sign up with email/password
- Stripe checkout for PRO plan
- Basic SEO (meta, OG/Twitter, JSON‑LD) and robots.txt

## Tech Stack

- Client: React 19, Vite 6
- Styling: Tailwind via CDN, custom CSS
- AI: `@google/genai` (Gemini 3 Pro preview with fallback)
- Auth: `better-auth` with Prisma adapter (PostgreSQL)
- DB: Prisma 7 on PostgreSQL
- Payments: Stripe Checkout + Webhooks
- Server: Node `http` with simple JSON handlers

## Project Structure

- `App.tsx` main app and UI flow
- `components/*` UI modules (Hero, InputArea, LivePreview, Auth modals, History)
- `services/gemini.ts` AI generation, refinement, framework conversion
- `services/storage.ts` client API calls for creations, folders, plan
- `services/authClient.ts` session and auth helpers
- `server/index.js` API routes for creations, folders, plan, Stripe
- `server/auth.js` Better Auth configuration (Prisma + PG)
- `server/db.js` PrismaClient with PG adapter
- `prisma/schema.prisma` database schema
- `vite.config.ts` dev server and env injection
- `public/robots.txt` indexing rules

## Environment Variables

Create a `.env.local` in the project root with:

- `GEMINI_API_KEY` — Google AI Studio key
- `STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — webhook signing secret (optional in dev)
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — app secret for auth
- `CLIENT_ORIGIN` — client URL used in Stripe success/cancel (default `http://localhost:3001`)

## Scripts

- `npm run dev` — start Vite dev server on `http://localhost:3000` (proxies `/api` to `5000`)
- `npm run server` — start Node API server on `http://localhost:5000`
- `npm run build` — production build
- `npm run preview` — preview build locally
- `npm run prisma:pull` — pull DB schema
- `npm run prisma:generate` — generate Prisma client
- `npm run auth:generate` — generate Better Auth SQL
- `npm run auth:migrate` — migrate Better Auth SQL
- `npm run auth:apply` — apply generated SQL via script

## Run Locally

1. Install dependencies: `npm install`
2. Create `.env.local` with the variables above
3. Start API server: `npm run server`
4. In another terminal, start the client: `npm run dev`
5. Open `http://localhost:3000`

## Core Flows

- Sign up/sign in (email/password) and manage session
- Upload an image or start with a text prompt
- Generate a project; preview and refine it
- Save creations, organize with folders, and export to React/Vue
- Upgrade via Stripe; after success, the client marks plan as PRO

## API Endpoints

- `GET /api/creations` — list creations for current user
- `POST /api/creations` — upsert a creation
- `DELETE /api/creations/:id` — delete a creation
- `GET /api/folders` — list folders for current user
- `POST /api/folders` — create a folder
- `PUT /api/folders/:id` — rename a folder
- `GET /api/user/plan` — get current plan
- `POST /api/user/plan` — set plan to `HOBBY` or `PRO`
- `POST /api/create-checkout-session` — Stripe checkout session
- `POST /api/webhook` — Stripe webhook receiver
- `GET/POST /api/auth/*` — Better Auth handler

References: `server/index.js` routes and helpers (server/index.js:81)

## SEO

- `index.html` includes meta description, Open Graph and Twitter cards, canonical link, and JSON‑LD `WebSite`
- `public/robots.txt` allows indexing

## Notes

- Dev proxy from client to server is configured in `vite.config.ts` (vite.config.ts:12)
- Gemini uses `process.env.API_KEY` injected from `GEMINI_API_KEY` (services/gemini.ts:12)
- Auth trusted origins are set in `server/auth.js` (server/auth.js:17)
