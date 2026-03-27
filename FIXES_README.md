# Backend – What to Fix

Quick scan of the logic and structure. Fix these for consistency, security, and maintainability.

**Status:** All items below have been addressed (see README.md for current setup).

---

## 1. **AppModule – duplicate registration**

**Issue:** `controllers` and `providers` in `app.module.ts` list `CandidateController`, `CandidateService`, `CompanyController`, `CompanyService`, `MissionController`, `MissionService`, etc. **and** you import `CandidateModule`, `CompanyModule`, `MissionModule`. Those modules already register their own controllers and providers. Listing them again in `AppModule` can lead to double registration and confusing behavior.

**Fix:** In `AppModule`, keep in `controllers` only **`AppController`** (and any other app-level controllers). Remove `CandidateController`, `PdfQrController`, `EventController`, `AuthController`, `ProfilController`, `ThemeController`, `R2Controller`, `CompanyController`, `MissionController` from the `controllers` array. In `providers`, keep only **`AppService`** and **`APP_GUARD`** (and any other app-level providers). Remove `CandidateService`, `PdfQrService`, `CompanyService`, `MissionService`. Let each feature module own its controllers and providers.

---

## 2. **Mission status: "refused" vs "rejected"**

**Issue:** In `prisma/schema.prisma`, `Mission.status` is documented as `// pending | accepted | rejected`. In the API (company controller/service) you use **`refused`** in the DTO and when updating.

**Fix:** Choose one and stick to it:

- Either use **`rejected`** in the API (controller + service) to match the schema comment and likely DB expectations,  
- Or keep **`refused`** and update the schema comment (and any docs) to say `pending | accepted | refused`, and ensure migrations/DB are aligned.

---

## 3. **Global ValidationPipe not enabled**

**Issue:** DTOs use `class-validator` (e.g. `CreateMissionDto`, `CreateIdeaDto`) but **`main.ts`** does not enable a global **`ValidationPipe`**. So validation decorators are not run automatically; invalid bodies can reach your handlers.

**Fix:** In `main.ts`, after creating the app:

```ts
import { ValidationPipe } from '@nestjs/common';

// after create()
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

Optionally add `forbidNonWhitelisted: true` if you want to reject unknown properties.

---

## 4. **CandidateService – PrismaClient instead of PrismaService**

**Issue:** In `candidate.service.ts` you use `private prisma = new PrismaClient()`. That bypasses Nest DI and the app lifecycle (e.g. `onModuleDestroy` disconnect). It can also create multiple connections.

**Fix:** Inject **`PrismaService`** (from `PrismaModule`) in `CandidateService` and use it instead of `new PrismaClient()`. Ensure `CandidateModule` imports `PrismaModule`.

---

## 5. **MissionModule is an empty stub**

**Issue:** `MissionController` and `MissionService` are empty. All mission logic (create, list, update, delete) lives in **CompanyModule** (company controller/service).

**Fix (choose one):**

- **Option A:** Remove **MissionModule** (and its controller/service) from `AppModule` imports and from the `controllers` / `providers` arrays so there is no unused “mission” module, **or**
- **Option B:** Keep MissionModule only if you plan to move mission endpoints there later; then document clearly that “missions” are currently handled under **Company** routes.

---

## 6. **Company POST mission – unauthenticated and spam risk**

**Issue:** `POST /company/portfolio/:slug/mission` (recruiter proposal) has **no auth** and no rate limit. Anyone can send unlimited requests for any candidate slug.

**Fix:**

- Add **rate limiting** for this route (e.g. `@Throttle(...)` or a dedicated throttler) to reduce spam.
- Optionally require a simple token or CAPTCHA for public proposal submission, or document that this is intentionally public and protect with external (e.g. API gateway) rate limits.

---

## 7. **Prisma client type assertions**

**Issue:** In **CompanyService** and **CandidateService** you use casts (e.g. `this.prisma as PrismaService & { mission: ... }` or `prisma as PrismaClient & { idea: ..., mission: ... }`) because TypeScript does not see `mission` / `idea` / `company` on the client.

**Fix:** After every schema change, run **`npx prisma generate`**. If the generated client includes `mission`, `idea`, `company`, remove these assertions and use `this.prisma` (or injected `PrismaService`) directly. If the generator still doesn’t expose them (e.g. old Node/Prisma version), keep the casts but add a short comment that they are for stale generated types.

---

## 8. **UpdateMission DTO – inline type instead of class**

**Issue:** In the company controller, the update body is typed inline as `dto: { status: 'accepted' | 'refused' }` with no validation.

**Fix:** Create an **`UpdateMissionDto`** (e.g. in `company/dto/`) with `class-validator` (e.g. `@IsIn(['accepted', 'refused'])` or `['accepted', 'rejected']` if you align with schema). Use it in the controller and optionally in the service for consistent validation and docs.

---

## 9. **JwtAuthGuard registration**

**Issue:** **CompanyModule** and **IdeaModule** add **`JwtAuthGuard`** to their `providers`. The guard is used in several modules; duplicating it can work but is redundant.

**Fix (optional):** Export **`JwtAuthGuard`** from **AuthModule** and import **AuthModule** in CompanyModule and IdeaModule instead of declaring the guard in each. Then remove `JwtAuthGuard` from their `providers`. This keeps a single source of truth for auth.

---

## 10. **Migrations and Prisma generate**

**Issue:** README and project do not clearly state that after pulling or changing the schema you must run **`npx prisma generate`** and, for DB changes, **`npx prisma migrate dev`** (or `migrate deploy` in production).

**Fix:** In the main **README.md**, add a short “Development” section that says:

1. Install deps: `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL`
3. Run migrations: `npx prisma migrate dev`
4. Generate client: `npx prisma generate`
5. Start: `npm run start:dev`

---

## Summary table

| # | Area              | Issue                                      | Priority |
|---|-------------------|--------------------------------------------|----------|
| 1 | AppModule         | Duplicate controllers/providers            | High     |
| 2 | Mission status     | "refused" vs "rejected" inconsistency      | Medium   |
| 3 | main.ts            | No global ValidationPipe                   | High     |
| 4 | CandidateService  | Use PrismaService instead of PrismaClient  | Medium   |
| 5 | MissionModule      | Empty stub – remove or document            | Low      |
| 6 | Company POST       | Rate limit / spam protection                | Medium   |
| 7 | Prisma types       | Run generate; remove or document casts     | Low      |
| 8 | UpdateMissionDto   | Use a validated DTO class                  | Low      |
| 9 | JwtAuthGuard       | Prefer export from AuthModule              | Low      |
|10 | README             | Document Prisma + migration steps          | Medium   |

Addressing 1, 2, 3, and 4 will have the biggest impact on correctness and consistency.
