# Auth Module – Scan Report / Rapport d'audit

> Generated: 2026-02-11  
> Scope: `src/auth/**`, `src/main.ts` (cookie / CORS), `prisma/schema.prisma` (RefreshToken)

---

## 1. File inventory / Inventaire des fichiers

| File | Role | Role (FR) |
|------|------|-----------|
| `auth.module.ts` | NestJS module – imports Prisma, JWT, provides strategy + guard | Module NestJS – importe Prisma, JWT, fournit la strategie + guard |
| `auth.controller.ts` | Routes: `POST google-login`, `POST refresh`, `POST logout` | Routes : `POST google-login`, `POST refresh`, `POST logout` |
| `auth.service.ts` | Google login, token generation, refresh, logout | Connexion Google, generation de tokens, refresh, deconnexion |
| `jwt.strategy.ts` | Passport JWT strategy (Bearer extraction) | Strategie Passport JWT (extraction Bearer) |
| `jwt-auth.guard.ts` | Simple `AuthGuard('jwt')` wrapper | Simple wrapper `AuthGuard('jwt')` |
| `dto/GoogleAuth.dto.ts` | Validation DTO for Google login body | DTO de validation pour le body du login Google |

---

## 2. Critical bugs / Bugs critiques

### BUG-1: JWT secret fallback is a **literal string**, not an env var / Le fallback du secret JWT est une **chaine de caracteres**, pas une variable d'env

```10:10:src/auth/jwt.strategy.ts
      secretOrKey: process.env.NEST_JWT_SECRET || 'process.env.NEXTAUTH_SECRET',
```

The fallback `'process.env.NEXTAUTH_SECRET'` is the **string literal**
`"process.env.NEXTAUTH_SECRET"`, not the env variable.  
If `NEST_JWT_SECRET` is unset, every token is signed/verified with a
publicly-known static string – anyone can forge JWTs.

Le fallback `'process.env.NEXTAUTH_SECRET'` est la **chaine literale**
`"process.env.NEXTAUTH_SECRET"`, pas la variable d'environnement.  
Si `NEST_JWT_SECRET` n'est pas defini, chaque token est signe/verifie avec
une chaine statique connue publiquement – n'importe qui peut forger des JWTs.

**Fix / Correction :** retirer les guillemets :

```ts
secretOrKey: process.env.NEST_JWT_SECRET || process.env.NEXTAUTH_SECRET,
```

---

### BUG-2: Cookie options are **inconsistent** between login and refresh/logout / Les options de cookies sont **incoherentes** entre login et refresh/logout

| Action | `secure` | `sameSite` | `path` |
|--------|----------|------------|--------|
| `handleGoogleLogin` (set) | `false` | `lax` | `/` |
| `refreshToken` (set) | `true` | `none` | *(missing / manquant – defaut = route courante)* |
| `logoutResponse` (clear) | `true` | `none` | *(missing / manquant)* |

**Consequences / Consequences :**

- After login, cookies are set with `secure:false, sameSite:'lax'`.
- The refresh endpoint tries to **overwrite** them with `secure:true, sameSite:'none'` and **no `path`**.  
  The browser treats these as **different cookies** (different attributes), so:
  - The old `lax` cookie is never deleted.
  - The new `none` cookie is set alongside it.
  - `clearCookie` in logout deletes only the `secure:true` variant; the original login cookie survives.
- On HTTPS prod, `secure:false` cookies set during login **will not be sent** for cross-site requests, breaking the flow entirely.

---

- Apres le login, les cookies sont crees avec `secure:false, sameSite:'lax'`.
- L'endpoint refresh tente de les **ecraser** avec `secure:true, sameSite:'none'` et **sans `path`**.  
  Le navigateur les traite comme des **cookies differents** (attributs differents), donc :
  - L'ancien cookie `lax` n'est jamais supprime.
  - Le nouveau cookie `none` est cree a cote.
  - `clearCookie` au logout ne supprime que la variante `secure:true` ; le cookie du login survit.
- En prod HTTPS, les cookies `secure:false` poses au login **ne seront pas envoyes** pour les requetes cross-site, cassant tout le flux.

**Fix / Correction :** utiliser une config cookie unique partout :

```ts
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  path: '/',
};
```

---

### BUG-3: `console.log(accessToken)` leaks the JWT to stdout / fuite du JWT dans stdout (line 55)

```54:55:src/auth/auth.service.ts
  const isProd = true; // ou process.env.NODE_ENV === 'production'
  console.log(accessToken)
```

Any log aggregator / container runtime captures the full access token.
Both lines should be removed.

N'importe quel aggregateur de logs / runtime de conteneur capture le token d'acces en entier.
Les deux lignes doivent etre supprimees.

---

## 3. Does refresh token work? / Le refresh token fonctionne-t-il ?

**Short answer: partially in dev, broken in prod.**  
**Reponse courte : partiellement en dev, casse en prod.**

### What the flow does / Ce que fait le flux

1. `POST /auth/google-login` → creates a refresh token in DB, sets it as
   `refresh_token` cookie (`secure:false, sameSite:lax, path:/`).  
   → cree un refresh token en BDD, le pose en cookie
   `refresh_token` (`secure:false, sameSite:lax, path:/`).

2. `POST /auth/refresh` → reads the token from `req.cookies.refresh_token`
   or `body.token`, validates against DB, rotates (create new + delete old),
   sets new cookies, returns new access token.  
   → lit le token depuis `req.cookies.refresh_token`
   ou `body.token`, valide en BDD, effectue une rotation (cree le nouveau + supprime l'ancien),
   pose les nouveaux cookies, retourne un nouveau access token.

### Why it breaks / Pourquoi ca casse

| # | Issue / Probleme | Impact |
|---|------------------|--------|
| 1 | Mismatched cookie attributes (BUG-2 above) / Attributs de cookie incoherents (BUG-2 ci-dessus) | Browser may not send the cookie on the refresh request, or may keep a stale copy after rotation. / Le navigateur peut ne pas envoyer le cookie sur la requete refresh, ou garder une copie perimee apres rotation. |
| 2 | JWT strategy only reads `Authorization: Bearer …` header. It never reads the `nest_token` cookie. / La strategie JWT ne lit que le header `Authorization: Bearer …`. Elle ne lit jamais le cookie `nest_token`. | Any guard-protected route requires the client to manually copy the token into an `Authorization` header. The cookie is set but never consumed by the backend. / Toute route protegee par un guard exige que le client copie manuellement le token dans un header `Authorization`. Le cookie est pose mais jamais lu par le backend. |
| 3 | Old refresh tokens accumulate. When a token expires or the user logs out, the DB row is never cleaned up. / Les anciens refresh tokens s'accumulent. Quand un token expire ou que l'utilisateur se deconnecte, la ligne en BDD n'est jamais nettoyee. | `refreshToken` table grows indefinitely. / La table `refreshToken` grossit indefiniment. |
| 4 | Race condition on token rotation: the new token is created **before** the old one is deleted (lines 120-121). / Condition de course sur la rotation : le nouveau token est cree **avant** que l'ancien soit supprime (lignes 120-121). | Acceptable risk, but wrapping in a transaction would be safer. / Risque acceptable, mais l'encapsuler dans une transaction serait plus sur. |
| 5 | Logout doesn't delete the refresh token from DB. / Le logout ne supprime pas le refresh token de la BDD. | The token remains valid even after the cookie is cleared. If it was leaked, it can still be used. / Le token reste valide meme apres suppression du cookie. S'il a fuite, il peut toujours etre utilise. |

---

## 4. Other issues / Autres problemes

### SEC-1: `GoogleLoginDto.id` is trusted blindly / `GoogleLoginDto.id` est accepte sans verification

The `id` field from the body is used as `googleId` without verifying the
Google ID token server-side (e.g. via `google-auth-library`). A client can
send any `id` + `email` combo and create/link accounts. This is the
**biggest security hole** in the auth flow.

Le champ `id` du body est utilise comme `googleId` sans verifier le
token Google cote serveur (ex. via `google-auth-library`). Un client peut
envoyer n'importe quelle combinaison `id` + `email` et creer/lier des comptes.
C'est la **plus grosse faille de securite** du flux d'authentification.

### SEC-2: No rate-limiting on auth endpoints / Pas de rate-limiting sur les endpoints auth

The `@Throttle` decorator is not applied on `AuthController`, so
login / refresh / logout have no throttle (only the global throttler from
`AppModule` applies, which is generous: 20 req/10s or 100 req/60s).

Le decorateur `@Throttle` n'est pas applique sur `AuthController`, donc
login / refresh / logout n'ont pas de throttle dedie (seul le throttler global
de `AppModule` s'applique, et il est genereux : 20 req/10s ou 100 req/60s).

### STYLE-1: Dead variable / Variable morte

```ts
const isProd = true; // ou process.env.NODE_ENV === 'production'
```

Used nowhere. Remove it.  
Utilisee nulle part. A supprimer.

### STYLE-2: Inconsistent indentation in `auth.service.ts` / Indentation incoherente dans `auth.service.ts`

`res.cookie(...)` calls in `handleGoogleLogin` are not indented to method
level (lines 57-71).  
Les appels `res.cookie(...)` dans `handleGoogleLogin` ne sont pas indentes au
niveau de la methode (lignes 57-71).

---

## 5. Summary table / Tableau recapitulatif

| # | Severity / Severite | File / Fichier | Description (EN) | Description (FR) |
|---|---------------------|----------------|-------------------|-------------------|
| BUG-1 | **CRITICAL** | `jwt.strategy.ts:10` | Secret fallback is a literal string | Le fallback du secret est une chaine literale |
| BUG-2 | **HIGH / ELEVE** | `auth.service.ts` | Cookie options mismatch login vs refresh vs logout | Options de cookie incoherentes entre login, refresh et logout |
| BUG-3 | **MEDIUM / MOYEN** | `auth.service.ts:55` | Access token logged to console | Access token affiche dans la console |
| SEC-1 | **CRITICAL** | `auth.service.ts` | Google ID token never verified server-side | Token Google jamais verifie cote serveur |
| SEC-2 | **LOW / FAIBLE** | `auth.controller.ts` | No dedicated rate-limit on auth routes | Pas de rate-limit dedie sur les routes auth |
| FUNC-1 | **HIGH / ELEVE** | `jwt.strategy.ts` | JWT extracted from Bearer header only – cookie never read | JWT extrait uniquement du header Bearer – cookie jamais lu |
| FUNC-2 | **MEDIUM / MOYEN** | `auth.service.ts` | Logout doesn't revoke refresh token in DB | Le logout ne revoque pas le refresh token en BDD |
| FUNC-3 | **LOW / FAIBLE** | `auth.service.ts` | Old/expired refresh tokens never pruned | Les refresh tokens anciens/expires ne sont jamais nettoyes |
| STYLE | **LOW / FAIBLE** | `auth.service.ts` | Dead code, inconsistent indentation | Code mort, indentation incoherente |
