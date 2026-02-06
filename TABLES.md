# Database tables (Prisma schema)

All tables from `prisma/schema.prisma`. Names match Prisma model names (default table names).

---

## User & auth

| Table           | Description                    |
|-----------------|--------------------------------|
| **User**       | Users (Google auth, subscription, profile) |
| **RefreshToken** | JWT refresh tokens            |

---

## Candidate & portfolio

| Table        | Description                              |
|-------------|------------------------------------------|
| **Candidate** | Candidate profiles (slug, CV, links)     |
| **Link**      | Candidate links (title, url, order)     |
| **Portfolio** | User portfolio (bio, theme, projects)    |
| **Project**   | Portfolio projects                       |
| **SoftSkill** | Portfolio soft skills                    |
| **Theme**     | Portfolio themes (colors, gradient)      |

---

## Company & missions

| Table     | Description                                      |
|----------|---------------------------------------------------|
| **Company** | Companies / recruiters (name, website, logo)    |
| **Mission** | Job offers (portfolio-only, link to Company)   |

---

## Ideas (Mind Trip)

| Table | Description                                      |
|-------|--------------------------------------------------|
| **Idea** | Mind Trip ideas (global or per portfolio, max 20 per portfolio) |

---

## Events

| Table          | Description                         |
|----------------|-------------------------------------|
| **Event**      | Events (title, slug, accessCode)    |
| **EventLink**  | Event links                         |
| **Instruction** | Event instructions                 |
| **Participant** | Event participants                 |

---

## Payments

| Table             | Description                    |
|-------------------|--------------------------------|
| **Payment**       | Payments (Stripe, type, status) |
| **PaymentSession** | Payment sessions (Stripe session, token) |

---

## QR

| Table     | Description              |
|----------|---------------------------|
| **SmartQR** | Smart QR config (slug, position, size) |

---

## Enums (no tables)

- **Subscription** – FREE, PRO, PREMIUM  
- **ModelType** – STANDARD, PORTFOLIO  
- **PaymentType** – portfolio, privacy_event, privacy_candidate  

---

## Full list (alphabetical)

1. Candidate  
2. Company  
3. Event  
4. EventLink  
5. Idea  
6. Instruction  
7. Link  
8. Mission  
9. Participant  
10. Payment  
11. PaymentSession  
12. Portfolio  
13. Project  
14. RefreshToken  
15. SmartQR  
16. SoftSkill  
17. Theme  
18. User  
