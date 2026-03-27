# Smart QR Candidat (Backend)

NestJS API for candidate profiles, portfolios, events, missions (job offers), and ideas (Mind Trip).

## Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env` (if present) or create `.env` with at least:
   - `DATABASE_URL` – PostgreSQL connection string

3. **Database**
   ```bash
   npx prisma migrate dev
   ```
   Apply pending migrations. Use `npx prisma migrate deploy` in production.

4. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```
   Run after any schema change so TypeScript and the app use the latest models.

5. **Start**
   ```bash
   npm run start:dev
   ```
   API runs by default on `http://localhost:5000` (or `process.env.PORT`).

## Scripts

- `npm run build` – build for production
- `npm run start` – run built app
- `npm run start:dev` – run with watch mode
- `npm run test` – run tests

## Main modules

- **Candidate** – candidate CRUD, portfolio, projects, links
- **Company** – recruiter proposals (create mission), list/update/delete missions (owner only)
- **Idea** – Mind Trip ideas (max 20 per portfolio, replace-oldest when full)
- **Event** – events, participants, instructions
- **Auth** – JWT, Google auth
- **Stripe** – payments, subscriptions
- **R2** – file storage (CV, images)

## API notes

- Mission status values: `pending` | `accepted` | `rejected` (use `rejected` for “refuse”).
- Recruiter proposal: `POST /company/portfolio/:slug/mission` is public and rate-limited (10/min).
- Portfolio missions/ideas: only the candidate (owner) can list, update, or delete them (JWT required).
