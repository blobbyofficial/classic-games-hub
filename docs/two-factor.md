# Two-factor authentication

TOTP second factor on login, using Supabase Auth's own MFA. Set up from
**Settings → Security**; answered at `/two-factor`.

## What lives where

| Piece | Where | Notes |
| --- | --- | --- |
| The factor itself | Supabase Auth (`auth.mfa_factors`) | Enrol, challenge, verify, unenrol - nothing is reimplemented |
| Whether a session has cleared it | `aal` claim in the access token | `aal1` = password only, `aal2` = second factor cleared |
| Recovery codes | `public.mfa_recovery_codes` (0076) | sha-256 hashes only, reached solely through `mfa_recovery_*` RPCs |
| Server actions | `actions/two-factor.ts` | Enrol, confirm, disable, challenge, recovery |
| Read | `services/two-factor.ts` | `getTwoFactorState()` - factors, aal, codes remaining |
| The gate | `lib/supabase/middleware.ts` | Funnels a pending session to `/two-factor` |
| UI | `features/settings/two-factor-settings.tsx`, `features/auth/two-factor-form.tsx` | |

There is **no Supabase dashboard toggle to find**: TOTP MFA is on by default for
a project. Nothing needs enabling before this works.

## The one idea worth holding onto

A password login always produces an `aal1` session, whether or not the account
has a second factor. That session is *authenticated* - `getUser()` returns a
user, RLS sees an `auth.uid()` - and it must nevertheless be treated as
worthless until the factor is cleared. That is the proxy's job:

```
user && nextLevel === "aal2" && currentLevel !== "aal2"  →  /two-factor
```

`nextLevel` comes from the verified factors on the session and `currentLevel`
from the `aal` claim, both read out of the token already in hand - so the check
costs no round trip, which matters in a proxy that runs on every request.

Only `/legal`, `/status` and `/two-factor` itself are reachable while a session
is pending (`PUBLIC_WHILE_PENDING`). Signing out works because the sign-out form
on `/two-factor` posts back to `/two-factor`.

> **If you add anything that must be safe against a half-authenticated session,
> put the rule in the database.** The proxy is a routing convenience. A
> policy that genuinely needs a cleared second factor should test the request's
> `aal` claim in SQL, not trust that the user could only have arrived through a
> page.

## Enrolling

1. `startTwoFactorEnrollment()` drops any leftover **unverified** factor, then
   enrols a new one. The QR arrives as raw SVG markup and is handed to the
   client base64-encoded as a data URL - no QR dependency anywhere.
2. The factor stays `unverified`, so logins do **not** ask for a code yet.
3. `confirmTwoFactorEnrollment()` verifies the first code, which promotes the
   factor and raises the session to `aal2`, then issues recovery codes.
4. Closing the dialog calls `cancelTwoFactorEnrollment()`, so an abandoned
   attempt leaves nothing behind. It refuses to touch a verified factor.

Turning it off costs a current code as well - `disableTwoFactor()` verifies
before it unenrols, so a borrowed session cannot quietly remove the protection.

## Recovery codes

Ten `XXXXX-XXXXX` codes, from an alphabet with no `I`, `L`, `O`, `U`, `0` or `1`
because these get copied by hand. They exist in plaintext exactly once, in the
response that shows them; the database gets hashes.

Using one is deliberately **not** a way to reach `aal2` - only the factor can do
that. `useRecoveryCode()` instead:

1. spends the code (`mfa_recovery_consume`, which locks the row so two
   simultaneous submissions spend it once),
2. deletes every factor on the account through the auth **admin** API - removing
   a verified factor is an `aal2` action, so it needs the service key,
3. clears the remaining codes, since they were minted for a factor that no
   longer exists.

The session then owes nothing, and the user lands signed in with 2FA off and a
message telling them to set it up again.

**This needs `SUPABASE_SECRET_KEY`.** Without it the action says recovery is
unavailable rather than burning a code for nothing. On a deployment with no
secret key, a lost authenticator is a support ticket.

## Verifying a change here

Both paths, on desktop and mobile:

- Enrol, cancel halfway, confirm the next login does **not** ask for a code.
- Enrol properly, log out, log in → `/two-factor`, wrong code, right code.
- While pending, try to reach `/settings` and `/friends` directly.
- Recovery code: use one, confirm 2FA is off, confirm the *same* code is
  rejected as already used the second time.
- Turn it off with a code, confirm `mfa_recovery_status()` returns zero.
