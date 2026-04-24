# Add Cloudflare Turnstile CAPTCHA to Signup

## Context
The site has a spam account problem. Adding Cloudflare Turnstile (free, privacy-friendly CAPTCHA) to the signup form will block bots while being invisible/minimal friction for real users. Turnstile is completely free with no usage limits.

## Files to Modify

1. **`src/lib/server/turnstile.js`** — NEW: server-side token verification utility
2. **`src/routes/signup/+page.server.js`** — Add `load()` to pass site key + verify token in action
3. **`src/routes/signup/+page.svelte`** — Add Turnstile script + widget div

## Implementation

### 1. Create `src/lib/server/turnstile.js`

Server-side utility following the same graceful degradation pattern as `src/lib/server/email.js`:

- Import `env` from `$env/dynamic/private`, `dev` from `$app/environment`
- Export `verifyTurnstileToken(token, remoteip)` function
- POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with secret + token
- When `TURNSTILE_SECRET_KEY` not set: skip verification (return success)
- When token missing but key IS set: return failure with "CAPTCHA verification required"
- Network errors: fail open in dev, fail closed in prod

### 2. Modify `src/routes/signup/+page.server.js`

**Add `load()` function** to pass site key to the client:
```js
import { env } from '$env/dynamic/private';
export function load() {
  return { turnstileSiteKey: env.TURNSTILE_SITE_KEY || '' };
}
```

**In the `default` action:**
- Add `getClientAddress` to destructured params
- Extract `cf-turnstile-response` from form data
- Call `verifyTurnstileToken()` before field validation/Argon2 hashing (reject bots cheaply)
- On failure: return error (displays in existing red error banner)

### 3. Modify `src/routes/signup/+page.svelte`

- Add `export let data;` alongside existing `export let form;`
- Load Turnstile script in `<svelte:head>`
- Add widget between Terms checkbox and Submit button (dark theme to match page)
- Widget only renders when site key is configured
- The `cf-turnstile-response` hidden input is auto-injected by Turnstile inside the form

### Environment Variables (add to Vercel + local .env)

| Variable | Where | Source |
|----------|-------|--------|
| `TURNSTILE_SITE_KEY` | Server → passed to client via load() | Cloudflare dashboard |
| `TURNSTILE_SECRET_KEY` | Server only | Cloudflare dashboard |

**Dev/test**: Use Cloudflare's official always-pass test keys or leave unset to skip entirely.

## Verification
1. `npx vite build` — no compilation errors
2. With keys: signup form shows Turnstile widget, submission works
3. Without keys: widget hidden, signup works normally (graceful degradation)
4. Submit without completing CAPTCHA in prod → error shown in existing red banner
