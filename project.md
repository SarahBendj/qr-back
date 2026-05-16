# Smart QR Candidat – Project Overview

## What is this SaaS?

**Smart QR Candidat** is a B2C/B2B SaaS platform for **job seekers (candidates)** and **recruiters (companies)**. The main idea: candidates get a **digital profile** linked to a **QR code**. That QR can be put on a CV, a business card, or a badge so that recruiters or event attendees can scan it and open the candidate’s **smart profile** (portfolio, projects, events, job offers).

So in one sentence: **a “smart business card” for candidates, with a shareable profile, portfolio, events, and job-offer (mission) management, monetized via subscriptions and paid features.**

---

## Who uses it?

| Actor | Role |
|-------|------|
| **Candidates** | Create a profile (with optional portfolio), get a unique slug + QR, manage events, receive job offers (missions), optionally pay for portfolio / privacy features. |
| **Recruiters / Companies** | Discover candidates via slug/QR, send job offers (missions) to a candidate’s portfolio, confirm/cancel proposals. |
| **Event attendees** | View public events, optionally register as participants (for events created by candidates). |

---

## Core features (from the backend)

1. **Candidate profile**
   - Auth via **Google** (JWT + refresh token, optional cookie).
   - Profile data: name, title, bio, CV, photo, links. Each candidate has a unique **slug** and a **QR code** pointing to `smart-profile/<slug>` or `smart-profile/portfolio/<slug>`.

2. **Portfolio** (optional, can be paywalled)
   - One portfolio per user: title, bio, image, theme.
   - **Projects** (title, description, tags, link, image).
   - **Soft skills**.
   - **Ideas** (“Mind Trip”) – cap of 20 per portfolio, FIFO when full.
   - **Missions** – job offers sent by recruiters to this portfolio.

3. **Missions (job offers)**
   - **Recruiters** create a company (or use existing), then send a mission to a candidate’s portfolio (by slug): position, location, type, salary, description, requirements, recruiter contact.
   - Candidate sees missions in their portfolio; status: `pending` | `accepted` | `rejected`.
   - Recruiter can cancel a mission (with tokenized link); candidate gets a **notification**.

4. **Events**
   - Candidates create **events** (title, description, location, date, category, visibility, optional access code, price, capacity, instructions, links).
   - **Participants** can be attached (name, role, email, confirmed).
   - Events can be public, private, or private+paid (paywall).

5. **Payments (Stripe)**
   - Subscriptions / one-off payments for:
     - **Portfolio** (unlock portfolio model).
     - **Privacy – event** (e.g. private events).
     - **Privacy – candidate** (e.g. private profile/access code).
   - Checkout sessions, webhooks, payment sessions with tokens for success/cancel flows.

6. **QR & PDF**
   - **QR code** generation for the candidate’s profile/portfolio URL.
   - **PDF-QR**: merge PDFs and overlay a QR (e.g. for CVs), plus access-code generation for PDFs.

7. **Wallet (Apple)**
   - Generate an **Apple Wallet pass** (.pkpass) for a candidate: QR encodes the portfolio URL, pass shows name/role.

8. **Storage (R2 / S3)**
   - CVs, profile pictures, event images, portfolio project images (via R2/S3-compatible API).

9. **Notifications**
   - In-app notifications (e.g. mission cancelled by recruiter).

10. **Themes**
    - Portfolio themes (colors, gradient, text) for customizing the public portfolio page.

---

## Tech stack (this repo)

- **Runtime**: Node.js  
- **Framework**: NestJS  
- **DB**: PostgreSQL + Prisma  
- **Auth**: JWT, Google OAuth, refresh tokens (DB-stored), optional httpOnly cookies  
- **Payments**: Stripe (Checkout, webhooks, subscriptions)  
- **Storage**: AWS SDK (R2/S3)  
- **Mail**: Resend (welcome, notifications, mission confirm/cancel, etc.)  
- **Other**: Passport JWT, cookie-parser, Throttler, class-validator, QRCode, passkit-generator (Apple Wallet), pdf-lib, sharp  

---

## Main backend modules

| Module | Purpose |
|--------|---------|
| **auth** | Google login, JWT, refresh token, logout |
| **candidate** | Candidate CRUD, portfolio, projects, soft skills, links, slug, QR URL generation |
| **company** | Company CRUD, mission create/list/update/delete, recruiter proposal (public), cancel mission + mail |
| **idea** | Mind Trip ideas (global + per-portfolio), max 20 per portfolio |
| **event** | Events CRUD, participants, instructions, links, access codes |
| **stripe** | Checkout sessions, webhooks, payment sessions, subscription/payment status, unlock portfolio/privacy |
| **pdf-qr** | Merge PDFs, overlay QR, generate access codes for PDFs |
| **wallet** | Apple Wallet pass generation (GET /wallet/pass) |
| **r2** | File uploads (CV, images) to R2/S3 |
| **theme** | Portfolio themes |
| **profil** | User profile (delete account, etc.) |
| **users** | User CRUD (minimal) |

---

## Frontend (out of this repo)

The backend expects a frontend (e.g. at `FRONTEND_URL` / `https://smart-qr.pro`) that implements:

- **smart-profile/<slug>** – public candidate profile (and optional portfolio).
- **smart-profile/portfolio/<slug>** – public portfolio page (projects, ideas, missions list for owner).
- Auth (login with Google, refresh, logout).
- Payment success/cancel (Stripe redirects).
- Dashboard for candidates (profile, portfolio, events, missions, notifications).
- Recruiter flow: enter candidate slug → submit mission proposal.

---

## Environment / deployment

- **Database**: `DATABASE_URL` (PostgreSQL).
- **Auth**: `NEST_JWT_SECRET` or `NEXTAUTH_SECRET`, Google OAuth (if used).
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `HOST`, `FRONTEND_BILLING_RETURN_URL`, etc.
- **R2/S3**: bucket, credentials, public URL.
- **Frontend**: `FRONTEND_URL` (e.g. `https://smart-qr.pro`) for links in emails, QR, Wallet pass.
- **Mail**: Resend (or similar) for transactional emails.

---

## Summary

Smart QR Candidat is a **candidate-centric SaaS**: one profile, one QR, one portfolio URL. Recruiters discover candidates via link/QR and send job offers (missions); candidates manage profile, portfolio, events, and payments (subscriptions / privacy). The backend is a NestJS API; the frontend (smart-qr.pro) serves the “smart profile” and dashboard.
